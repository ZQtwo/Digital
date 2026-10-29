@extends("plant.layoutplant")

@push('scripts')
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
@endpush

@section("plantmain")
<div id="success-root">
	<!-- 非空态 -->
	<div data-success-hero></div>
	<div data-success-address></div>
	<div data-success-items></div>
	<!-- 空态 -->
	<div data-success-empty hidden></div>
</div>

<!-- Hero section -->
<template id="tpl-success-hero">
	<section class="container success__hero card card--padded">
		<span class="success__icon" aria-hidden="true">
			<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 L9.5 18 L20 6.5" /></svg>
		</span>
		<div class="success__text">
			<span class="eyebrow" data-success-eyebrow></span>
			<h1 class="display-2" data-success-title></h1>
			<p class="lede" data-success-lede></p>
		</div>
		<div id="pay-countdown-zone"></div>
		<dl class="success__facts" data-success-facts></dl>
		<div class="success__actions" data-success-actions></div>
	</section>
</template>

<!-- Countdown (active) -->
<template id="tpl-pay-countdown-active">
	<div class="pay-countdown" aria-label="支付倒计时">
		<span class="pay-countdown__label">请在</span>
		<span class="pay-countdown__time">
			<span id="pc-m"></span><span class="pay-countdown__sep">:</span>
			<span id="pc-s"></span>
		</span>
		<span class="pay-countdown__label">内完成支付，超时订单将自动取消</span>
	</div>
</template>

<!-- Address section -->
<template id="tpl-success-block">
	<section class="container card card--padded success__block">
		<h2 class="display-3" data-block-title></h2>
		<div data-block-content></div>
	</section>
</template>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/order-success.js') }}"></script>
@endpush
