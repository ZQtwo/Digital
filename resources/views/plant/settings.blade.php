@extends("plant.layoutplant")

@push('scripts')
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
@endpush

@section("plantmain")
<div class="container page-scoped" id="settings-container">
					<header class="page-head">
						<a href="/shuma/profile" class="page-head__back">‹ 返回</a>
						<h1 class="page-head__title">设置</h1>
					</header>
					<section class="setting-group">
						<h2 class="setting-group__title">消息通知</h2>
						<div class="setting-row card">
							<div class="setting-row__info">
								<p class="setting-row__label">推送通知</p>
								<p class="setting-row__desc">接收订单、活动等站内通知</p>
							</div>
							<label class="switch">
								<input type="checkbox" data-key="push">
								<span class="switch__slider"></span>
							</label>
						</div>
						<div class="setting-row card">
							<div class="setting-row__info">
								<p class="setting-row__label">短信通知</p>
								<p class="setting-row__desc">订单状态变更短信提醒</p>
							</div>
							<label class="switch">
								<input type="checkbox" data-key="sms">
								<span class="switch__slider"></span>
							</label>
						</div>
						<div class="setting-row card">
							<div class="setting-row__info">
								<p class="setting-row__label">邮件通知</p>
								<p class="setting-row__desc">促销活动与新品邮件</p>
							</div>
							<label class="switch">
								<input type="checkbox" data-key="email">
								<span class="switch__slider"></span>
							</label>
						</div>
					</section>
					<section class="setting-group">
						<h2 class="setting-group__title">隐私</h2>
						<div class="setting-row card">
							<div class="setting-row__info">
								<p class="setting-row__label">个性化推荐</p>
								<p class="setting-row__desc">基于浏览记录推荐商品</p>
							</div>
							<label class="switch">
								<input type="checkbox" data-key="privacy">
								<span class="switch__slider"></span>
							</label>
						</div>
						<div class="setting-row card">
							<div class="setting-row__info">
								<p class="setting-row__label">保存浏览历史</p>
								<p class="setting-row__desc">记录最近浏览过的商品</p>
							</div>
							<label class="switch">
								<input type="checkbox" data-key="history">
								<span class="switch__slider"></span>
							</label>
						</div>
					</section>
					<section class="setting-group">
						<h2 class="setting-group__title">外观</h2>
						<div class="setting-row card setting-row--col">
							<div class="setting-row__info">
								<p class="setting-row__label">外观主题</p>
								<p class="setting-row__desc">选择界面显示模式</p>
							</div>
							<div class="theme-options">
								<label class="theme-opt"><input type="radio" name="theme" value="auto">跟随系统</label>
								<label class="theme-opt"><input type="radio" name="theme" value="light">浅色</label>
								<label class="theme-opt"><input type="radio" name="theme" value="dark">深色</label>
							</div>
						</div>
					</section>
					<section class="setting-group">
						<h2 class="setting-group__title">账户</h2>
						<button type="button" class="setting-row card setting-row--btn" data-action="go-security">
							<div class="setting-row__info">
								<p class="setting-row__label">账户安全</p>
								<p class="setting-row__desc">管理密码、手机号、实名认证、授权应用</p>
							</div>
							<span class="setting-row__arrow">›</span>
						</button>
						<button type="button" class="setting-row card setting-row--btn is-danger" data-action="logout">
							<div class="setting-row__info">
								<p class="setting-row__label">退出登录</p>
								<p class="setting-row__desc">退出当前账号</p>
							</div>
							<span class="setting-row__arrow">›</span>
						</button>
						<button type="button" class="setting-row card setting-row--btn" data-action="clear-cache">
							<div class="setting-row__info">
								<p class="setting-row__label">清除缓存</p>
								<p class="setting-row__desc">清除本地浏览缓存与搜索历史</p>
							</div>
							<span class="setting-row__arrow">›</span>
						</button>
					</section>
				</div>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/settings.js') }}"></script>
@endpush
