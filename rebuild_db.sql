SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. ssc_yonghu (用户/会员)
-- ============================================================
CREATE TABLE ssc_yonghu (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100),
  phone VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  level_code VARCHAR(20) DEFAULT 'normal',
  level_override VARCHAR(20),
  total_spent DECIMAL(12,2) DEFAULT 0,
  order_count INT DEFAULT 0,
  balance DECIMAL(12,2) DEFAULT 0,
  points INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  register_type VARCHAR(20) DEFAULT 'self',
  created_by VARCHAR(50),
  channel VARCHAR(50),
  verified_phone TINYINT(1) DEFAULT 1,
  password_set TINYINT(1) DEFAULT 1,
  source_inviter VARCHAR(50),
  last_active_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE KEY uk_phone (phone),
  KEY idx_level (level_code),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. ssc_shangpin (商品)
-- ============================================================
CREATE TABLE ssc_shangpin (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  subtitle VARCHAR(300),
  brand_id BIGINT UNSIGNED,
  category_id BIGINT UNSIGNED,
  art_key VARCHAR(100),
  art_seed INT,
  cover_image VARCHAR(500),
  price DECIMAL(12,2) NOT NULL,
  list_price DECIMAL(12,2),
  rating DECIMAL(3,1) DEFAULT 0,
  rating_count INT DEFAULT 0,
  sales INT DEFAULT 0,
  stock INT DEFAULT 0,
  threshold INT DEFAULT 10,
  tags JSON,
  highlights JSON,
  specs JSON,
  options JSON,
  description TEXT,
  on_sale TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE KEY uk_sku (sku_code),
  KEY idx_brand (brand_id),
  KEY idx_category (category_id),
  KEY idx_sale (on_sale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. ssc_dingdan (订单)
-- ============================================================
CREATE TABLE ssc_dingdan (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL UNIQUE,
  member_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  freight DECIMAL(12,2) DEFAULT 0,
  pay_amount DECIMAL(12,2) NOT NULL,
  coupon_id BIGINT UNSIGNED,
  pay_method VARCHAR(20),
  receiver_name VARCHAR(100),
  receiver_phone VARCHAR(30),
  receiver_address VARCHAR(500),
  remark VARCHAR(500),
  pay_at DATETIME,
  ship_at DATETIME,
  complete_at DATETIME,
  cancel_at DATETIME,
  cancel_reason VARCHAR(500),
  created_at DATETIME,
  updated_at DATETIME,
  KEY idx_member (member_id),
  KEY idx_status (status),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. ssc_gouwuche (购物车)
-- ============================================================
CREATE TABLE ssc_gouwuche (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  spec_snapshot JSON,
  created_at DATETIME,
  updated_at DATETIME,
  KEY idx_member_product (member_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. ssc_dingdan_xiangmu (订单项) — no timestamps
-- ============================================================
CREATE TABLE ssc_dingdan_xiangmu (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(200),
  sku_code VARCHAR(50),
  price DECIMAL(12,2) NOT NULL,
  quantity INT NOT NULL,
  spec_snapshot JSON,
  subtotal DECIMAL(12,2) NOT NULL,
  comment_id BIGINT UNSIGNED,
  KEY idx_order (order_id),
  KEY idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. ssc_dingdan_fankui (订单反馈)
-- ============================================================
CREATE TABLE ssc_dingdan_fankui (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED,
  order_no VARCHAR(50),
  type VARCHAR(32) DEFAULT 'suggestion',
  subject VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  contact VARCHAR(50),
  status VARCHAR(16) DEFAULT 'pending',
  admin_reply TEXT,
  replied_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  KEY idx_member (member_id),
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. ssc_dizhi (地址)
-- ============================================================
CREATE TABLE ssc_dizhi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT UNSIGNED NOT NULL,
  receiver_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  province VARCHAR(50),
  city VARCHAR(50),
  district VARCHAR(50),
  detail VARCHAR(300),
  is_default TINYINT(1) DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME,
  KEY idx_member (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 8. ssc_fenlei (分类)
-- ============================================================
CREATE TABLE ssc_fenlei (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  parent_id BIGINT UNSIGNED,
  level INT DEFAULT 1,
  art_key VARCHAR(100),
  sort_order INT DEFAULT 0,
  status TINYINT(1) DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME,
  KEY idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 9. ssc_pinpai (品牌)
-- ============================================================
CREATE TABLE ssc_pinpai (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  logo_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  status TINYINT(1) DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 10. ssc_guanliyuan (管理员)
-- ============================================================
CREATE TABLE ssc_guanliyuan (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_code VARCHAR(50) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  realname VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(100),
  role_code VARCHAR(20) DEFAULT 'admin',
  status TINYINT(1) DEFAULT 1,
  last_login_at DATETIME,
  login_count INT DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 11. ssc_hengfu (横幅)
-- ============================================================
CREATE TABLE ssc_hengfu (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  position VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  image_url VARCHAR(500),
  link_url VARCHAR(500),
  weight INT DEFAULT 0,
  enabled TINYINT(1) DEFAULT 1,
  start_at DATETIME,
  end_at DATETIME,
  created_by VARCHAR(50),
  created_at DATETIME,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 12. ssc_kucun_rizhi (库存日志) — no updated_at
-- ============================================================
CREATE TABLE ssc_kucun_rizhi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_id VARCHAR(50),
  product_id BIGINT UNSIGNED NOT NULL,
  type_code VARCHAR(30) NOT NULL,
  quantity INT NOT NULL,
  before_val INT,
  after_val INT,
  reason VARCHAR(500),
  operator VARCHAR(50),
  undo_of BIGINT UNSIGNED,
  created_at DATETIME,
  KEY idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 13. ssc_pingjia (评价) — has created_at NO updated_at
-- ============================================================
CREATE TABLE ssc_pingjia (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED,
  order_item_id BIGINT UNSIGNED,
  rating INT NOT NULL,
  content TEXT,
  tag VARCHAR(100),
  anonymous TINYINT(1) DEFAULT 0,
  nickname_snapshot VARCHAR(100),
  status TINYINT(1) DEFAULT 1,
  created_at DATETIME,
  KEY idx_product (product_id),
  KEY idx_member (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 14. ssc_shezhi (设置) — NO created_at, has updated_at
-- ============================================================
CREATE TABLE ssc_shezhi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  site_name VARCHAR(100),
  site_subtitle VARCHAR(200),
  default_theme VARCHAR(50),
  date_format VARCHAR(20),
  currency VARCHAR(10),
  order_notify TINYINT(1) DEFAULT 1,
  alert_threshold INT DEFAULT 10,
  copyright VARCHAR(200),
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 15. ssc_shoucang (收藏) — no timestamps, has created_at as fillable
-- ============================================================
CREATE TABLE ssc_shoucang (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME,
  KEY idx_member (member_id),
  KEY idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 16. ssc_tuihuanhuo (退换货)
-- ============================================================
CREATE TABLE ssc_tuihuanhuo (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_no VARCHAR(50) NOT NULL UNIQUE,
  order_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  type_code VARCHAR(20) NOT NULL,
  reason VARCHAR(500),
  amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  status_timeline JSON,
  operator VARCHAR(50),
  handle_note VARCHAR(500),
  created_at DATETIME,
  updated_at DATETIME,
  KEY idx_member (member_id),
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 17. ssc_yonghu_youhuiquan (用户已领券) — no timestamps
-- ============================================================
CREATE TABLE ssc_yonghu_youhuiquan (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT UNSIGNED NOT NULL,
  template_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200),
  amount DECIMAL(12,2) NOT NULL,
  threshold DECIMAL(12,2) DEFAULT 0,
  scope VARCHAR(20) DEFAULT 'all',
  order_id BIGINT UNSIGNED,
  used TINYINT(1) DEFAULT 0,
  claimed_at DATETIME,
  expire_at DATETIME,
  used_at DATETIME,
  KEY idx_member (member_id),
  KEY idx_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 18. ssc_youhuiquan_moban (优惠券模板)
-- ============================================================
CREATE TABLE ssc_youhuiquan_moban (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200),
  amount DECIMAL(12,2) NOT NULL,
  threshold DECIMAL(12,2) DEFAULT 0,
  valid_days INT DEFAULT 7,
  scope VARCHAR(20) DEFAULT 'all',
  scope_value VARCHAR(500),
  description VARCHAR(500),
  total_count INT DEFAULT 0,
  remaining INT DEFAULT 0,
  per_limit INT DEFAULT 1,
  status TINYINT(1) DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
