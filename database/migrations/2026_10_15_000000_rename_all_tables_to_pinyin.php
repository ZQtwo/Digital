<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 表名映射（英文 → 拼音）
     */
    private array $tableMap = [
        'ssc_address'         => 'ssc_dizhi',
        'ssc_admin'           => 'ssc_guanliyuan',
        'ssc_banner'          => 'ssc_hengfu',
        'ssc_brand'           => 'ssc_pinpai',
        'ssc_cart'            => 'ssc_gouwuche',
        'ssc_category'        => 'ssc_fenlei',
        'ssc_coupon_template' => 'ssc_youhuiquan_moban',
        'ssc_favorite'        => 'ssc_shoucang',
        'ssc_inventory_log'   => 'ssc_kucun_rizhi',
        'ssc_member'          => 'ssc_huiyuan',
        'ssc_order'           => 'ssc_dingdan',
        'ssc_order_feedback'  => 'ssc_dingdan_fankui',
        'ssc_order_item'      => 'ssc_dingdan_xiangmu',
        'ssc_product'         => 'ssc_shangpin',
        'ssc_return'          => 'ssc_tuihuanhuo',
        'ssc_review'          => 'ssc_pingjia',
        'ssc_setting'         => 'ssc_shezhi',
        'ssc_user_coupon'     => 'ssc_yonghu_youhuiquan',
    ];

    public function up(): void
    {
        // MariaDB RENAME TABLE 会自动更新所有 FK 的引用表名，无需手动 DROP/重建
        // 只 rename 实际存在的旧表（兼容 fresh migrate 时 cart/feedback 已直接用拼音创建）
        $pairs = [];
        foreach ($this->tableMap as $old => $new) {
            if (Schema::hasTable($old)) {
                $pairs[] = "`{$old}` TO `{$new}`";
            }
        }
        if (!empty($pairs)) {
            DB::statement('RENAME TABLE ' . implode(', ', $pairs));
        }
    }

    public function down(): void
    {
        $pairs = [];
        foreach ($this->tableMap as $old => $new) {
            if (Schema::hasTable($new)) {
                $pairs[] = "`{$new}` TO `{$old}`";
            }
        }
        if (!empty($pairs)) {
            DB::statement('RENAME TABLE ' . implode(', ', $pairs));
        }
    }
};
