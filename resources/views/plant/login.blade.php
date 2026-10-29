@extends("plant.layoutplant")

@section("plantmain")
<div class="login container">
					<div class="login__grid">
						<section class="login__intro">
							<span class="eyebrow">ACCOUNT / DEMO</span>
							<h1 class="display-2 login__title">登录后，收藏与订单才会被记住。</h1>
							<p class="lede">纯前端购物演示，数据仅保存在本机，清空站点数据即彻底重置。</p>
							<ul class="login__points">
								<li><span class="login__tick" aria-hidden="true">01</span>短信验证码任意 6 位数字均可通过</li>
								<li><span class="login__tick" aria-hidden="true">02</span>所有数据只保存在本机浏览器</li>
								<li><span class="login__tick" aria-hidden="true">03</span>不会采集、上传或共享任何个人信息</li>
							</ul>
						</section>
						<section class="card card--padded login__card" id="login-form-card">
							<span class="eyebrow">SIGN IN</span>
							<h2 class="display-3 login__card-title">登录 VOLTA</h2>
							<div class="login-tabs" role="tablist">
								<button type="button" class="login-tabs__item is-on" data-tab="password">密码登录</button>
								<button type="button" class="login-tabs__item" data-tab="sms">短信登录</button>
							</div>
							<form class="login__form" novalidate data-action="submit-login">
								<div class="field">
									<label class="field__label" for="lg-phone-p">手机号</label>
									<input id="lg-phone-p" class="input mono" type="tel" inputmode="numeric"
										maxlength="11" placeholder="11 位手机号" autocomplete="tel" value=""
										data-field="phone">
								</div>
								<div class="field">
									<label class="field__label" for="lg-pwd">密码</label>
									<input id="lg-pwd" class="input mono" type="password" maxlength=""
										placeholder="6 位以上密码" autocomplete="current-password" value=""
										data-field="password">
								</div>
								<div class="field">
									<label class="field__label" for="lg-nick">昵称<span
											class="field__hint">（选填）</span></label>
									<input id="lg-nick" class="input" type="text" maxlength="12" placeholder="不填则自动生成"
										value="" data-field="nick">
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
								<button type="submit" class="btn btn--primary btn--block">登录</button>
								<p class="login__foot login__foot--split">
									<span>还没有账号？<a href="/shuma/register">立即注册</a></span>
									<a href="/shuma/help">帮助中心</a>
								</p>
							</form>
						</section>
					</div>
				</div>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/login.js') }}"></script>
@endpush
