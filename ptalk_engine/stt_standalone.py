import os
import glob
import time
import numpy as np
import soundfile as sf
from pathlib import Path

class STTEngineStandalone:
    def __init__(self, zipformer_dir="./models/ZipFormer", use_gpu_whisper=False):
        self.zipformer_dir = zipformer_dir
        self.engine_type = "zipformer"
      
        # 1. Thử Load ZipFormer (sherpa-onnx) trên CPU
        if os.path.exists(zipformer_dir):
            try:
                import sherpa_onnx
                tokens = os.path.join(zipformer_dir, "tokens.txt")
              
                def _pick_onnx(prefix):
                    cands = sorted(glob.glob(os.path.join(zipformer_dir, f"{prefix}*.onnx")))
                    if not cands:
                        raise FileNotFoundError(f"Missing {prefix}.onnx in {zipformer_dir}")
                    return cands[0]

                self.recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
                    tokens=tokens,
                    encoder=_pick_onnx("encoder"),
                    decoder=_pick_onnx("decoder"),
                    joiner=_pick_onnx("joiner"),
                    num_threads=4,
                    sample_rate=16000,
                    feature_dim=80,
                    decoding_method="greedy_search",
                    provider="cpu",
                )
                print("✅ [STT] Loaded ZipFormer-30M (sherpa-onnx) on CPU")
                return
            except Exception as e:
                print(f"⚠️ [STT] ZipFormer load failed: {e}. Falling back to Whisper...")

        # 2. Fallback sang Faster-Whisper
        self.engine_type = "whisper"
        from faster_whisper import WhisperModel
        device = "cuda" if use_gpu_whisper else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        self.whisper_model = WhisperModel("medium", device=device, compute_type=compute_type)
        print(f"✅ [STT] Loaded Faster-Whisper (medium) on {device}")

    def _condition_audio(self, audio: np.ndarray, sr: int) -> np.ndarray:
        """Highpass 80Hz + Spectral Gating + Peak Normalization"""
        from scipy.signal import butter, sosfilt
      
        # Highpass 80Hz
        sos = butter(4, 80, btype="high", fs=sr, output="sos")
        out = sosfilt(sos, audio.astype("float64"))
      
        # Noise reduction (nếu có noisereduce)
        try:
            import noisereduce as nr
            out = nr.reduce_noise(y=out.astype("float32"), sr=sr, stationary=True, prop_decrease=0.9)
        except ImportError:
            pass
          
        # Peak Normalize
        peak = float(np.abs(out).max())
        if peak > 1e-12:
            out = out / peak * 0.7
        return np.ascontiguousarray(out, dtype="float32")

    def transcribe(self, audio_path: str) -> str:
        """Transcribe file WAV/MP3/M4A ra văn bản tiếng Việt"""
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
        # Load audio -> float32 mono
        audio, sr = sf.read(audio_path, dtype="float32", always_2d=False)
        if audio.ndim == 2:
            audio = audio.mean(axis=1)

        # Lọc nhiễu nếu âm thanh nhỏ (RMS < -33 dB)
        rms_db = 20.0 * np.log10(np.sqrt((audio ** 2).mean()) + 1e-12)
        if rms_db < -33:
            audio = self._condition_audio(audio, sr)

        if self.engine_type == "zipformer":
            stream = self.recognizer.create_stream()
            stream.accept_waveform(sr, audio)
            self.recognizer.decode_stream(stream)
            text = stream.result.text.strip()
        else:
            segments, _ = self.whisper_model.transcribe(
                audio, language="vi", beam_size=3, vad_filter=True
            )
            text = " ".join(seg.text.strip() for seg in segments).strip()

        return text.lower()

# --- Example Usage ---
if __name__ == "__main__":
    stt = STTEngineStandalone(zipformer_dir="./models/ZipFormer")
    print("Engine Init Complete.")
