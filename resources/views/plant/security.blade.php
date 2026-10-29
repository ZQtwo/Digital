@extends("plant.layoutplant")

@push('scripts')
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
@endpush

@section("plantmain")
<div class="container page-scoped" id="security-container">
					<header class="page-head">
						<a href="/shuma/settings" class="page-head__back">‹ 返回设置</a>
						<h1 class="page-head__title">账户安全</h1>
					</header>
					<section class="setting-group">
						<h2 class="setting-group__title">登录与交易</h2>
						<button type="button" class="setting-row card setting-row--btn security-row"
							data-action="login-password">
							<div class="setting-row__info">
								<p class="setting-row__label">登录密码</p>
								<p class="setting-row__desc">修改账号登录密码</p>
							</div>
							<span class="security-row__status" data-sec-status="loginPasswordSet">—</span>
							<span class="setting-row__arrow">›</span>
						</button>
						<button type="button" class="setting-row card setting-row--btn security-row"
							data-action="pay-password">
							<div class="setting-row__info">
								<p class="setting-row__label">支付密码</p>
								<p class="setting-row__desc">6 位支付密码，用于下单支付验证</p>
							</div>
							<span class="security-row__status" data-sec-status="payPasswordSet">—</span>
							<span class="setting-row__arrow">›</span>
						</button>
					</section>
					<section class="setting-group">
						<h2 class="setting-group__title">身份验证</h2>
						<button type="button" class="setting-row card setting-row--btn security-row"
							data-action="bind-phone">
							<div class="setting-row__info">
								<p class="setting-row__label">绑定手机号</p>
								<p class="setting-row__desc">用于找回密码、接收安全通知</p>
							</div>
							<span class="security-row__status" data-sec-status="boundPhone">—</span>
							<span class="setting-row__arrow">›</span>
						</button>
						<button type="button" class="setting-row card setting-row--btn security-row"
							data-action="realname">
							<div class="setting-row__info">
								<p class="setting-row__label">实名认证</p>
								<p class="setting-row__desc">完成实名后可正常下单与提现</p>
							</div>
							<span class="security-row__status" data-sec-status="verified">—</span>
							<span class="setting-row__arrow">›</span>
						</button>
					</section>
					<section class="setting-group">
						<h2 class="setting-group__title">授权管理</h2>
						<button type="button" class="setting-row card setting-row--btn security-row"
							data-action="authorizations">
							<div class="setting-row__info">
								<p class="setting-row__label">账号授权管理</p>
								<p class="setting-row__desc">查看并撤销已授权的第三方应用</p>
							</div>
							<span class="security-row__status" data-sec-status="authorizations">—</span>
							<span class="setting-row__arrow">›</span>
						</button>
					</section>
					<section class="setting-group">
						<h2 class="setting-group__title">账号</h2>
						<button type="button" class="setting-row card setting-row--btn security-row danger-tone"
							data-action="deactivate">
							<div class="setting-row__info">
								<p class="setting-row__label">注销账号</p>
								<p class="setting-row__desc">注销后数据不可恢复，请谨慎操作</p>
							</div>
							<span class="security-row__status tone-danger">永久删除账号及所有数据</span>
							<span class="setting-row__arrow">›</span>
						</button>
					</section>
				</div>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/security.js') }}"></script>
@endpush
