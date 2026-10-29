@extends("plant.layoutplant")

@section("plantmain")
<div class="login container">
					<div class="login__grid">
						<section class="login__intro">
							<span class="eyebrow">CREATE ACCOUNT</span>
							<h1 class="display-2 login__title">注册账号，开启你的 VOLTA 之旅。</h1>
							<p class="lede">注册即表示同意《用户协议》与《隐私说明》。所有数据仅保存在本机浏览器。</p>
						</section>
						<section class="card card--padded login__card" id="register-form-card">
							<span class="eyebrow">SIGN UP</span>
							<h2 class="display-3 login__card-title">创建账号</h2>
							<form class="login__form" novalidate data-action="submit-register">
								<div class="field">
									<label class="field__label" for="rg-phone">手机号</label>
									<input id="rg-phone" class="input mono" type="tel" inputmode="numeric"
										maxlength="11" placeholder="11 位手机号" autocomplete="tel" value=""
										data-field="手机号">
								</div>
								<div class="field">
									<label class="field__label" for="rg-pwd">密码</label>
									<input id="rg-pwd" class="input" type="password" maxlength="32" placeholder="至少 6 位"
										autocomplete="new-password" value="" data-field="密码">
								</div>
								<div class="field">
									<label class="field__label" for="rg-cfm">确认密码</label>
									<input id="rg-cfm" class="input" type="password" maxlength="32" placeholder="再次输入密码"
										autocomplete="new-password" value="" data-field="确认密码">
								</div>
								<div class="field">
									<label class="field__label" for="rg-nick">昵称<span
											class="field__hint">（选填）</span></label>
									<input id="rg-nick" class="input" type="text" maxlength="12" placeholder="不填则自动生成"
										value="" data-field="昵称">
								</div>
								<label class="agree">
									<input type="checkbox" checked data-field="agreed">
									<span class="agree__box" aria-hidden="true"><svg width="11" height="11"
											viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"
											stroke-linecap="round" stroke-linejoin="round">
											<path d="M2.5 6.2 L5 8.6 L9.5 3.6" />
										</svg></span>
									<span>我已阅读并同意《用户协议》与《隐私说明》（演示文本）</span>
								</label>
								<button type="submit" class="btn btn--primary btn--block">立即注册</button>
								<p class="login__foot login__foot--split">
									<span>已有账号？<a href="/shuma/login">立即登录</a></span>
								</p>
							</form>
						</section>
					</div>
				</div>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/register.js') }}"></script>
@endpush
