DELETE FROM ssc_dizhi WHERE member_id NOT IN (SELECT id FROM ssc_yonghu);
INSERT INTO ssc_yonghu (member_code, name, phone, password_hash, level_code, status, created_at, updated_at)
VALUES ('MTESTADDR02', 'TestMember', '13900001111', '$2y$10$ezsMBTZGKDyIuEBq1ooAnerxo0jEpORKD7JNDgNhQVmr/6u9.4mgK', 'normal', 'normal', NOW(), NOW());
SELECT id, phone, name FROM ssc_yonghu WHERE phone='13900001111';
SELECT COUNT(*) AS addr_rows FROM ssc_dizhi;
