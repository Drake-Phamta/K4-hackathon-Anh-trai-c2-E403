import os

# Đường dẫn tương đối từ thư mục ptalk_engine
folders = [
    "models/ZipFormer",
    "data",
    "audio_output"
]

for folder in folders:
    os.makedirs(folder, exist_ok=True)
    print(f"✅ Đã tạo thư mục: {folder}/")

# Tạo sẵn file text mẫu
ref_txt_path = "data/ref.txt"
if not os.path.exists(ref_txt_path):
    with open(ref_txt_path, "w", encoding="utf-8") as f:
        f.write("Xin chào, đây là giọng mẫu để hệ thống nhái theo.")
    print("✅ Đã tạo file chữ mẫu data/ref.txt")

print("\n🎉 SETUP HOÀN TẤT!")
print("📌 LƯU Ý: Vui lòng tự chép các file ZipFormer (.onnx) vào 'models/ZipFormer/'")
print("📌 LƯU Ý: Vui lòng tự chép file âm thanh 'ref.wav' vào thư mục 'data/' để dùng tính năng Voice Cloning.")
