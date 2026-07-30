import os
import re
import json
import socket
import torch
import soundfile as sf
import numpy as np
from pathlib import Path
import time

HOST = "127.0.0.1"
PORT = 8001
MODEL_ID = "splendor1811/omnivoice-vietnamese"
DEFAULT_REF_AUDIO = "./data/ref.wav"
DEFAULT_REF_TEXT_FILE = "./data/ref.txt"
OUTPUT_DIR = Path("./audio_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def load_tts_model():
    from omnivoice import OmniVoice
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    print(f"🔧 Loading OmniVoice on {device}...")
    model = OmniVoice.from_pretrained(
        MODEL_ID,
        device_map=device,
        dtype=torch.float16 if "cuda" in device else torch.float32,
    )
    print("✅ OmniVoice Ready!")
    return model

@torch.inference_mode()
def synthesize_text(model, text: str, ref_audio=DEFAULT_REF_AUDIO, ref_text_file=DEFAULT_REF_TEXT_FILE, speed=1.0) -> str:
    if not text.strip():
        return ""
      
    ref_text = ""
    if os.path.exists(ref_text_file):
        ref_text = Path(ref_text_file).read_text(encoding="utf-8").strip()

    # 1. Chunking: Cắt văn bản ngắn < 180 ký tự để tránh mất chữ/lỗi EOS
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    chunks = []
    curr = ""
    for s in sentences:
        if len(curr) + len(s) < 180:
            curr += s + " "
        else:
            if curr: chunks.append(curr.strip())
            curr = s + " "
    if curr: chunks.append(curr.strip())
    if not chunks: chunks = [text]

    # 2. Sinh âm thanh từng chunk
    all_tensors = []
    for chunk in chunks:
        synth_text = chunk
        if synth_text and synth_text[-1] not in ".!?,;:]}":
            synth_text += "."  # Thêm dấu chấm cuối câu ép model phát âm hết từ
          
        tensors = model.generate(
            text=synth_text,
            ref_audio=ref_audio,
            ref_text=ref_text,
            num_step=32,
            speed=speed,
            language="vi",
        )
        all_tensors.append(tensors[0].cpu())

    final_tensor = torch.cat(all_tensors, dim=-1)
    wav_np = final_tensor.squeeze().numpy().astype(np.float32)

    # 3. Post-Processing: True Peak Normalization (-1 dB Target Peak)
    peak = np.max(np.abs(wav_np))
    if peak > 0:
        target_linear = 10 ** (-1.0 / 20)  # -1 dBFS
        wav_np = wav_np * (target_linear / peak)
    wav_np = np.clip(wav_np, -1.0, 1.0)

    # 4. Xuất file WAV 24kHz & Raw PCM16
    out_path = OUTPUT_DIR / f"tts_{int(time.time()*1000)}.wav"
    sf.write(str(out_path), wav_np, 24000)

    return str(out_path)

def run_socket_server(model):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print(f"🚀 TTS TCP Socket Server Listening on {HOST}:{PORT}")

    while True:
        conn, addr = server.accept()
        try:
            data = b""
            while True:
                chunk = conn.recv(4096)
                if not chunk or b"\n" in chunk:
                    data += chunk
                    break
                data += chunk
            if data:
                req = json.loads(data.decode("utf-8"))
                out_file = synthesize_text(model, req["text"], speed=req.get("speed", 1.0))
                conn.sendall((json.dumps({"output_path": out_file}) + "\n").encode("utf-8"))
        except Exception as e:
            conn.sendall((json.dumps({"error": str(e)}) + "\n").encode("utf-8"))
        finally:
            conn.close()

if __name__ == "__main__":
    model = load_tts_model()
    run_socket_server(model)
