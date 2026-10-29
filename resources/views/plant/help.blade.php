@extends("plant.layoutplant")

@section("plantmain")
<div class="container page-scoped">
					<header class="page-head">
						<a href="/shuma/profile" class="page-head__back">‹ 返回</a>
						<h1 class="page-head__title">帮助中心</h1>
					</header>
					<section class="help-section">
						<h2 class="help-section__title">常见问题</h2>
						<div class="faq-list">
							<details class="faq-item" data-faq="0">
								<summary class="faq-q"><span class="faq-q__mark">Q</span>如何下单购买商品？</summary>
								<div class="faq-a"><span
										class="faq-a__mark">A</span>在商品详情页选择规格后点击"加入购物车"或"立即购买"，确认地址后提交订单即可。支持微信、支付宝等多种支付方式。
								</div>
							</details>
							<details class="faq-item" data-faq="1">
								<summary class="faq-q"><span class="faq-q__mark">Q</span>下单后多久发货？</summary>
								<div class="faq-a"><span class="faq-a__mark">A</span>一般 24
									小时内发货，节假日可能略有延迟。发货后会收到短信通知，可在"我的订单"中查看物流状态。</div>
							</details>
							<details class="faq-item" data-faq="2">
								<summary class="faq-q"><span class="faq-q__mark">Q</span>如何申请退换货？</summary>
								<div class="faq-a"><span
										class="faq-a__mark">A</span>在"我的订单"中找到对应订单，点击"申请售后"，选择退款或退货原因提交申请。审核通过后会收到进一步指引。
								</div>
							</details>
							<details class="faq-item" data-faq="3">
								<summary class="faq-q"><span class="faq-q__mark">Q</span>优惠券如何使用？</summary>
								<div class="faq-a"><span
										class="faq-a__mark">A</span>在结算页面，系统会自动匹配可用优惠券。也可在"我的优惠券"中手动选择。每张优惠券限用一次，不可叠加。
								</div>
							</details>
							<details class="faq-item" data-faq="4">
								<summary class="faq-q"><span class="faq-q__mark">Q</span>忘记密码怎么办？</summary>
								<div class="faq-a"><span
										class="faq-a__mark">A</span>在登录页点击"忘记密码"，通过注册手机号接收验证码重置。若手机号已更换，请联系客服协助处理。</div>
							</details>
							<details class="faq-item" data-faq="5">
								<summary class="faq-q"><span class="faq-q__mark">Q</span>如何联系客服？</summary>
								<div class="faq-a"><span class="faq-a__mark">A</span>客服工作时间 9:00-21:00。可通过页面右下角在线客服、电话
									400-888-0000 或邮件 support@volta.store 联系我们。</div>
							</details>
						</div>
					</section>
					<section class="help-section">
						<h2 class="help-section__title">联系我们</h2>
						<div class="contact-grid">
							<div class="contact-item card">
								<span class="contact-item__icon">📞</span>
								<div class="contact-item__body">
									<p class="contact-item__label">客服热线</p>
									<p class="contact-item__value">400-888-0000</p>
									<p class="contact-item__desc">9:00 - 21:00（全年无休）</p>
								</div>
							</div>
							<div class="contact-item card">
								<span class="contact-item__icon">💬</span>
								<div class="contact-item__body">
									<p class="contact-item__label">在线客服</p>
									<p class="contact-item__value">点击咨询</p>
									<p class="contact-item__desc">网站右下角即时对话</p>
								</div>
							</div>
							<div class="contact-item card">
								<span class="contact-item__icon">✉️</span>
								<div class="contact-item__body">
									<p class="contact-item__label">邮件支持</p>
									<p class="contact-item__value">support@volta.store</p>
									<p class="contact-item__desc">24 小时内回复</p>
								</div>
							</div>
							<div class="contact-item card">
								<span class="contact-item__icon">📍</span>
								<div class="contact-item__body">
									<p class="contact-item__label">公司地址</p>
									<p class="contact-item__value">北京市朝阳区建国路88号</p>
									<p class="contact-item__desc">VOLTA 数码大厦</p>
								</div>
							</div>
						</div>
					</section>
				</div>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/help.js') }}"></script>
@endpush
