document.addEventListener('DOMContentLoaded', () => {
    const recordBtn = document.getElementById('record-btn');
    const chatHistory = document.getElementById('chat-history');
    const slideText = document.getElementById('slide-text').innerText;
    
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // Yêu cầu quyền Micro
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = e => {
                audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                // Sử dụng ogg để tương thích tốt hơn với backend STT
                const audioBlob = new Blob(audioChunks, { type: 'audio/ogg' });
                audioChunks = [];
                sendAudioToBackend(audioBlob);
            };
        })
        .catch(err => {
            console.error("Không có quyền truy cập Micro:", err);
            alert("Vui lòng cấp quyền Micro trên trình duyệt để dùng tính năng Voice Chat!");
        });

    // Xử lý nút Giữ để nói
    recordBtn.addEventListener('mousedown', startRecording);
    recordBtn.addEventListener('mouseup', stopRecording);
    recordBtn.addEventListener('mouseleave', stopRecording); 
    recordBtn.addEventListener('touchstart', startRecording);
    recordBtn.addEventListener('touchend', stopRecording);

    function startRecording() {
        if (!mediaRecorder || isRecording) return;
        isRecording = true;
        mediaRecorder.start();
        recordBtn.classList.add('recording');
        recordBtn.querySelector('span').innerText = "Đang nghe...";
    }

    function stopRecording() {
        if (!mediaRecorder || !isRecording) return;
        isRecording = false;
        mediaRecorder.stop();
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('span').innerText = "Đang xử lý...";
        recordBtn.disabled = true;
    }

    function sendAudioToBackend(audioBlob) {
        appendMessage("user", "🎙️ [Đã gửi âm thanh]");

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.ogg"); 
        formData.append("context", slideText);

        fetch("http://localhost:8000/api/v1/voice_chat", {
            method: "POST",
            body: formData
        })
        .then(async response => {
            if (!response.ok) {
                const errText = await response.text();
                throw new Error("Lỗi máy chủ: " + errText);
            }
            
            // Backend trả về File âm thanh
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.play();
            
            appendMessage("ai", "🔊 [AI đang trả lời bằng giọng nói]");
            
            recordBtn.querySelector('span').innerText = "Giữ để nói";
            recordBtn.disabled = false;
        })
        .catch(err => {
            console.error(err);
            appendMessage("ai", "❌ Lỗi: " + err.message);
            recordBtn.querySelector('span').innerText = "Giữ để nói";
            recordBtn.disabled = false;
        });
    }

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        const p = document.createElement('p');
        p.innerText = text;
        msgDiv.appendChild(p);
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
});
