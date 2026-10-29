<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ssc_guanliyuan', function (Blueprint $table) {
            $table->string('nickname')->nullable()->after('username')->comment('昵称');
            $table->string('avatar')->nullable()->after('nickname')->comment('头像URL');
            $table->string('gender', 16)->nullable()->after('email')->comment('性别');
            $table->string('department')->nullable()->after('gender')->comment('部门');
            $table->string('position')->nullable()->after('department')->comment('职位');
            $table->text('bio')->nullable()->after('position')->comment('个人简介');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ssc_guanliyuan', function (Blueprint $table) {
            $table->dropColumn(['nickname', 'avatar', 'gender', 'department', 'position', 'bio']);
        });
    }
};
