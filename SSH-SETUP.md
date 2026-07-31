# Cấp quyền SSH cho Claude vào server RAG (171.226.10.121)

Claude đã tự sinh một cặp khoá **ed25519 riêng cho máy này** (private key nằm ở
`C:\Users\Admin\.ssh\id_ed25519_claude`, không bao giờ rời máy, không commit).
Anh chỉ cần dán **public key** dưới đây vào server một lần.

## Public key

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIbq9PfiTX5qnWfkYDTkJzjh79nJjJV2ik7sp91UOJKO claude-code-hackathon
```

## Cách cài (chọn 1 trong 2)

### Cách A — từ chính máy Windows này (nhanh nhất)

Mở PowerShell, chạy đúng dòng này (nó sẽ hỏi mật khẩu của `namnx` một lần duy nhất):

```powershell
type $env:USERPROFILE\.ssh\id_ed25519_claude.pub | ssh namnx@171.226.10.121 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### Cách B — anh tự vào server rồi dán tay

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIbq9PfiTX5qnWfkYDTkJzjh79nJjJV2ik7sp91UOJKO claude-code-hackathon' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Thêm vào `~/.ssh/config` (Claude bị chặn sửa file này, anh dán giúp)

Sửa khối `Host 171.226.10.121` trong `C:\Users\Admin\.ssh\config` thành:

```
Host 171.226.10.121 ptalk
  HostName 171.226.10.121
  User namnx
  IdentityFile ~/.ssh/id_ed25519_claude
  IdentitiesOnly yes
```

Nếu không sửa config thì cũng chạy được, chỉ là mỗi lệnh phải kèm `-i ~/.ssh/id_ed25519_claude`.

## Kiểm tra xong chưa

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_claude namnx@171.226.10.121 "hostname; ls ~"
```

Ra được tên máy + danh sách thư mục là xong. Báo Claude một tiếng, Claude vào tiếp.

---

## Những gì đã dò được mà KHÔNG cần SSH (tính đến lúc viết file này)

| Thông tin | Giá trị |
|---|---|
| LLM gateway | `http://171.226.10.121:8000/llm/v1/chat/completions` (vLLM, mount ở `/llm`) |
| Model | `gemma-4`, `max_model_len` = **16384 token** |
| Xác thực | `Authorization: Bearer <LLM_API_KEY>` — thiếu key trả `{"error":"Unauthorized"}` |
| App gốc cổng 8000 | title `PTalk Elderly`, `/health` → `{"status":"ok","service":"ptalk-kid_physic"}` |
| Voice (STT/TTS) | `https://aitools.ptit.edu.vn/holobox` — API hosted của PTIT, không nằm trên server này |

`openapi.json` ở gốc cổng 8000 **chỉ khai báo `/health`** — nghĩa là các endpoint
retrieval/RAG không nằm ở app đó, hoặc nằm ở tiến trình/cổng khác. Phải vào SSH mới
biết chắc; đoán mò endpoint là cách nhanh nhất để lấy sai tài liệu.
