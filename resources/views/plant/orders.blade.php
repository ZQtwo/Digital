@extends("plant.layoutplant")

@push('scripts')
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
@endpush

@section("plantmain")
<div id="orders-root">
	<div class="container orders">
		<header class="orders__head">
			<span class="eyebrow">ORDERS</span>
			<h1 class="display-2">我的订单</h1>
		</header>
		<div data-orders-tabs></div>
		<div data-orders-body>
			<!-- 订单卡片列表或空态 -->
		</div>
	</div>
</div>

<!-- Status tab button -->
<template id="tpl-order-tab">
	<button type="button" role="tab" class="sort-chip" data-status="" aria-selected="false">
		<span data-tab-label></span>
		<span class="status-tabs__count mono" data-tab-count>0</span>
	</button>
</template>

<!-- Order card -->
<template id="tpl-order-card">
	<li class="order-card card" data-order-id>
		<header class="order-card__head">
			<div class="order-card__ids">
				<span class="mono order-card__no" data-order-no></span>
				<span class="mono order-card__time" data-order-time></span>
			</div>
			<span class="tag" data-order-status-tag></span>
		</header>
		<ul class="order-card__items" data-order-items></ul>
		<footer class="order-card__foot">
			<div class="order-card__addr" data-order-addr></div>
			<div class="order-card__amount" data-order-amount></div>
			<div class="order-card__actions" data-order-actions></div>
		</footer>
		<div class="order-card__rate-slot" data-order-rate-slot></div>
	</li>
</template>

<!-- Order line item -->
<template id="tpl-order-line">
	<li class="order-line">
		<a href="" class="order-line__art" data-orderline-art></a>
		<div class="order-line__info">
			<a href="" class="order-line__name" data-orderline-name></a>
			<span class="order-line__opt mono" data-orderline-opt></span>
		</div>
		<span class="mono order-line__qty" data-orderline-qty></span>
		<span class="mono order-line__price" data-orderline-price></span>
	</li>
</template>

<!-- Rate form -->
<template id="tpl-rate-form">
	<div class="order-card__rate">
		<p class="eyebrow">RATE THIS ORDER</p>
		<div class="rate-stars" role="radiogroup" aria-label="评分" data-rate-stars></div>
		<textarea class="input rate-textarea" data-rate-review placeholder="说说你的使用感受（选填，最多 200 字）" maxlength="200" rows="3"></textarea>
		<div class="rate-form-foot">
			<label class="rate-anon"><input type="checkbox" data-rate-anon /><span>匿名评价</span></label>
		</div>
		<div class="rate-actions">
			<button type="button" class="btn btn--sm" data-action="cancel-rate">取消</button>
			<button type="button" class="btn btn--sm btn--primary" data-action="submit-rate">提交评价</button>
		</div>
	</div>
</template>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/orders.js') }}?v=20261022a"></script>
@endpush
