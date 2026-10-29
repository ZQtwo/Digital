<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ssc_dingdan_fankui', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_id')->index();
            $table->unsignedBigInteger('order_id')->nullable()->index()->comment('关联订单，可为空（非订单类反馈）');
            $table->string('order_no', 32)->nullable()->index();
            $table->string('type', 32)->default('suggestion')->comment('suggestion 建议 / complaint 投诉 / praise 表扬 / bug 问题');
            $table->string('subject', 200)->comment('反馈标题');
            $table->text('content')->comment('反馈详情');
            $table->string('contact', 50)->nullable()->comment('联系方式（可选）');
            $table->string('status', 16)->default('pending')->comment('pending 待处理 / processing 处理中 / resolved 已解决 / closed 已关闭');
            $table->text('admin_reply')->nullable()->comment('后台回复');
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();

            $table->foreign('member_id')->references('id')->on('ssc_huiyuan')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('ssc_dingdan')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ssc_dingdan_fankui');
    }
};
