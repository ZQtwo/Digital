<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Model
{
    use HasApiTokens;

    protected $table = 'ssc_guanliyuan';

    protected $fillable = [
        'admin_code', 'username', 'nickname', 'avatar', 'password_hash',
        'realname', 'phone', 'email', 'gender', 'department', 'position', 'bio',
        'role_code', 'status', 'last_login_at', 'login_count',
    ];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'login_count' => 'integer',
        'last_login_at' => 'datetime',
    ];

    public function isSuper(): bool
    {
        return $this->role_code === 'super';
    }
}
