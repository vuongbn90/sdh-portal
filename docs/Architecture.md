# SDH Portal Enterprise v1.0 - Architecture

## Nguyên tắc
- Single Source of Truth: mỗi dữ liệu chỉ lưu một nơi.
- Không sao chép thông tin giảng viên/học viên sang module khác; dùng khóa liên kết.
- Mỗi module có Page, Service, SQL migration, Exporter và README.
- Database dùng migration an toàn: chỉ ADD TABLE/ADD COLUMN/ADD INDEX, không DROP dữ liệu cũ.

## Nhóm module
1. Core: auth, profiles, roles, permissions, notifications.
2. Admissions: tuyển sinh, hồ sơ, xét tuyển, nhập học.
3. Academic: chương trình, học phần, kế hoạch học tập, đăng ký, điểm, lịch học.
4. Faculty/Supervisors: giảng viên, người hướng dẫn, phân công, tải hướng dẫn.
5. Research/RIS: LLKH, công bố, đề tài, KPI nghiên cứu, xuất Word/PDF.
6. Quality: CLO, PLO, Bloom, Outcome Assessment, Curriculum Analytics, CQI.
7. Workflow: quy trình điện tử, phê duyệt, nhật ký.
8. Reports: dashboard, Excel, PDF, Word.
