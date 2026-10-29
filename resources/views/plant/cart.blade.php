@extends("plant.layoutplant")

@push('scripts')
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
@endpush

@section("plantmain")
<div id="cart-root">
	<!-- 空态（JS 动态切换为非空态） -->
	<div class="cart container" data-cart-main hidden>
		<div class="cart__head">
			<span class="eyebrow">SHOPPING CART</span>
			<h1 class="display-2">购物车</h1>
			<p class="mono cart__count" data-count>N 件商品</p>
		</div>
		<div class="cart__layout">
			<main class="cart__main" data-cart-items>
				<!-- JS 填 renderBar + cart-item 列表 -->
			</main>
			<aside class="cart__summary card card--padded" data-cart-summary>
				<!-- JS 填 summary 内容 -->
			</aside>
		</div>
	</div>
	<!-- 空态占位 -->
	<div data-cart-empty hidden></div>
	<!-- 移动端底部操作栏 -->
	<div class="action-bar cart-action" data-cart-action hidden></div>
</div>

<!-- 购物车行 template -->
<template id="tpl-cart-item">
	<li class="cart-item" data-key="">
		<label class="check-line">
			<input type="checkbox" data-action="toggle-check" data-key="" />
			<span class="check-line__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>
		</label>
		<a href="" class="cart-item__art" data-art></a>
		<div class="cart-item__info">
			<a href="" class="cart-item__name" data-name></a>
			<span class="cart-item__options mono" data-options></span>
			<span class="cart-item__brand mono" data-brand></span>
			<span class="cart-item__warn mono" data-warn hidden></span>
		</div>
		<div class="cart-item__price mono" data-price></div>
		<div class="cart-item__qty" data-qty></div>
		<div class="cart-item__total" data-total></div>
		<button type="button" class="cart-item__del" data-action="remove" aria-label="移除">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></svg>
		</button>
	</li>
</template>

<!-- 顶部操作 bar -->
<template id="tpl-cart-bar">
	<div class="cart__bar">
		<label class="check-line">
			<input type="checkbox" data-action="toggle-check" data-key="all" />
			<span class="check-line__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>
			<span>全选</span>
		</label>
		<div class="cart__bar-actions">
			<button type="button" class="btn btn--sm btn--ghost" data-action="remove-checked">删除选中</button>
			<button type="button" class="btn btn--sm btn--ghost" data-action="clear-all">清空</button>
		</div>
	</div>
</template>

<!-- 右侧结算 summary -->
<template id="tpl-cart-summary">
	<div class="summary">
		<p class="eyebrow">SUMMARY</p>
		<dl class="summary__list">
			<div><dt>已选商品</dt><dd class="mono" data-summary-qty></dd></div>
			<div><dt>商品金额</dt><dd class="mono" data-summary-amount></dd></div>
			<div><dt>运费</dt><dd class="mono" data-summary-shipping></dd></div>
		</dl>
		<div class="summary__total"><span>合计</span><span class="price price--lg"><span class="price__sym">¥</span><span data-summary-total></span></span></div>
		<button type="button" class="btn btn--primary btn--block" data-action="checkout">去结算</button>
		<p class="summary__note">优惠券与运费将在结算页统一计算，登录后可继续下单。</p>
	</div>
</template>

<!-- 移动端底部 action bar -->
<template id="tpl-cart-action-bar">
	<label class="check-line">
		<input type="checkbox" data-action="toggle-check" data-key="all" />
		<span class="check-line__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>
		<span>全选</span>
	</label>
	<div class="cart-action__total">
		<span class="mono cart-action__hint" data-action-qty></span>
		<span class="price price--md"><span class="price__sym">¥</span><span data-action-total></span></span>
	</div>
	<button type="button" class="btn btn--primary" data-action="checkout">结算</button>
</template>

<!-- 空态 -->
<template id="tpl-cart-empty">
	<div class="container cart cart--empty"></div>
</template>

<!-- check-line only 版本（用于 item 勾选） -->
<template id="tpl-check-line-only">
	<label class="check-line check-line--only">
		<input type="checkbox" data-action="toggle-check" data-key="" aria-label="" />
		<span class="check-line__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>
	</label>
</template>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/cart.js') }}?v=20261022b"></script>
@endpush
