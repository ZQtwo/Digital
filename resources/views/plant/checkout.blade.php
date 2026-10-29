@extends("plant.layoutplant")

@push('scripts')
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
@endpush

@section("plantmain")
<div id="checkout-root">
	<!-- 非空态主骨架（JS 切换显隐） -->
	<div class="checkout container" data-checkout-main hidden>
		<header class="checkout__head">
			<span class="eyebrow">CHECKOUT</span>
			<h1 class="display-2">确认订单</h1>
		</header>
		<div class="checkout__layout">
			<div class="checkout__main">
				<div data-checkout-address></div>
				<div data-checkout-shipping></div>
				<div data-checkout-coupon></div>
				<div data-checkout-pay></div>
				<div data-checkout-items></div>
			</div>
			<aside data-checkout-summary></aside>
		</div>
	</div>
	<!-- 空态占位 -->
	<div data-checkout-empty hidden></div>
</div>

<!-- 收货地址 block -->
<template id="tpl-checkout-block">
	<section class="card card--padded block">
		<div class="block__head">
			<h2 class="display-3" data-block-title></h2>
			<span class="eyebrow" data-block-step></span>
		</div>
		<div data-block-body></div>
	</section>
</template>

<!-- 地址卡片 -->
<template id="tpl-checkout-addr-card">
	<div class="checkout-addr-card" data-action="pick-addr">
		<div class="checkout-addr-card__main">
			<div class="checkout-addr-card__row">
				<span class="checkout-addr-card__name" data-addr-name></span>
				<span class="checkout-addr-card__phone mono" data-addr-phone></span>
				<span class="checkout-addr-card__default" data-addr-default hidden>默认</span>
			</div>
			<p class="checkout-addr-card__region" data-addr-region></p>
			<p class="checkout-addr-card__detail" data-addr-detail></p>
		</div>
		<span class="checkout-addr-card__arrow" aria-hidden="true">›</span>
	</div>
</template>

<!-- 地址空态 -->
<template id="tpl-checkout-addr-empty">
	<div class="checkout-addr-empty" data-action="pick-addr">
		<span class="checkout-addr-empty__icon">📍</span>
		<span class="checkout-addr-empty__text" data-addr-empty-text></span>
		<span class="checkout-addr-empty__arrow">›</span>
	</div>
</template>

<!-- 配送选项 radio-card -->
<template id="tpl-radio-card-wide">
	<label class="radio-card radio-card--wide">
		<input type="radio" name="shipping" value="" data-action="pick-shipping" data-value="" />
		<span class="radio-card__text"><strong data-radio-label></strong><em data-radio-desc></em></span>
		<span class="mono radio-card__fee" data-radio-fee></span>
	</label>
</template>

<!-- 支付选项 radio-card -->
<template id="tpl-radio-card">
	<label class="radio-card">
		<input type="radio" name="pay" value="" data-action="pick-pay" data-value="" />
		<span data-radio-pay-label></span>
	</label>
</template>

<!-- 订单商品项 -->
<template id="tpl-order-item">
	<li class="order-item">
		<span class="order-item__art" data-order-art></span>
		<span class="order-item__info">
			<span class="order-item__name" data-order-name></span>
			<span class="order-item__opt mono" data-order-opt></span>
		</span>
		<span class="mono order-item__qty" data-order-qty></span>
		<span class="mono order-item__price" data-order-price></span>
	</li>
</template>

<!-- 右侧 summary -->
<template id="tpl-checkout-summary">
	<div class="summary card card--padded">
		<p class="eyebrow">PAYMENT</p>
		<dl class="summary__list">
			<div><dt>商品金额</dt><dd class="mono" data-summary-subtotal></dd></div>
			<div><dt>优惠券</dt><dd class="mono" data-summary-discount></dd></div>
			<div><dt>运费</dt><dd class="mono" data-summary-shipping></dd></div>
		</dl>
		<div class="summary__total"><span>应付金额</span><span class="price price--lg"><span class="price__sym">¥</span><span data-summary-payable></span></span></div>
		<label class="agree">
			<input type="checkbox" data-action="toggle-agree" />
			<span class="agree__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>
			<span>我已阅读并同意《购买须知》与《隐私说明》（演示文本）</span>
		</label>
		<button type="button" class="btn btn--primary btn--block" data-action="submit">去支付</button>
		<ul class="promise"><li>订单信息保存在本地浏览器，清空站点数据即会重置</li><li>如需重来，可在「我的订单」中删除演示订单</li></ul>
	</div>
</template>

<!-- 空态容器 -->
<template id="tpl-checkout-empty">
	<div class="container checkout"></div>
</template>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/checkout.js') }}?v={{ time() }}"></script>
@endpush
