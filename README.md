# School Checkin Dashboard

## ขั้นตอน Deploy

### 1. Push GitHub
```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/USERNAME/school-dashboard.git
git push -u origin main
```

### 2. เพิ่ม Redirect URI ใน Google Cloud Console
ไปที่ APIs & Services → Credentials → OAuth client
เพิ่ม Authorized redirect URIs:
```
https://your-app.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

### 3. Deploy Vercel
- vercel.com → Import repo
- Environment Variables:
  | ชื่อ | ค่า |
  |------|-----|
  | GOOGLE_CLIENT_ID | จาก oauth_client.json |
  | GOOGLE_CLIENT_SECRET | จาก oauth_client.json |
  | NEXTAUTH_SECRET | รัน: openssl rand -base64 32 |
  | NEXTAUTH_URL | https://your-app.vercel.app |
  | NEXT_PUBLIC_BASE_URL | https://your-app.vercel.app |
  | CURRENT_SEMESTER | 1 หรือ 2 |

### 4. วิธีใช้ (ครูแต่ละคน)
1. เปิด https://your-app.vercel.app
2. กด "Login ด้วย Google"
3. เลือก Gmail ที่ใช้ในโปรแกรมเช็คชื่อ
4. ระบบดึง Google Sheet อัตโนมัติ ไม่ต้องตั้งค่าอะไรเพิ่ม
