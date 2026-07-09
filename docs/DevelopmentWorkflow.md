# Quy trình phát triển chuyên nghiệp

## Branch
- main: production
- develop: môi trường tích hợp
- feature/<module>: phát triển từng module

## Quy trình
1. Tạo branch từ develop.
2. Lập trình và test trên localhost.
3. Commit rõ nội dung.
4. Push lên GitHub.
5. Vercel tạo Preview Deployment.
6. Test preview.
7. Merge vào develop.
8. Khi ổn định, merge develop vào main.

## Không commit
- .env
- node_modules
- file tạm
