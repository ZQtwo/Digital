<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ssc_gouwuche', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_id')->index();
            $table->unsignedBigInteger('product_id')->index();
            $table->unsignedInteger('quantity')->default(1);
            $table->json('spec_snapshot')->nullable()->comment('规格快照，如颜色/版本等');
            $table->timestamps();

            $table->index(['member_id', 'product_id']);
            $table->foreign('member_id')->references('id')->on('ssc_huiyuan')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('ssc_shangpin')->onDelete('cascade');
        });

        Schema::table('ssc_gouwuche', function (Blueprint $table) {
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ssc_gouwuche');
    }
};
