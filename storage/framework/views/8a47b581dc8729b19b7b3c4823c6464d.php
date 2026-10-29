

<?php $__env->startPush('scripts'); ?>
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
<?php $__env->stopPush(); ?>

<?php $__env->startSection("plantmain"); ?>
<div id="confirm-root">
	<!-- 非空态主骨架 -->
	<div class="container confirm" data-confirm-main hidden>
		<header class="confirm__head">
			<span class="eyebrow">CONFIRM ORDER</span>
			<h1 class="display-2">确认订单</h1>
		</header>
		<div class="confirm__layout">
			<div class="confirm__main">
				<div data-confirm-status-bar></div>
				<div data-confirm-address></div>
				<div data-confirm-shipping></div>
				<div data-confirm-coupon></div>
				<div data-confirm-pay></div>
				<div data-confirm-items></div>
			</div>
			<aside data-confirm-summary></aside>
		</div>
	</div>
	<!-- 空态 -->
	<div data-confirm-empty hidden></div>
	<!-- 移动端 action bar -->
	<div class="action-bar confirm-action" data-confirm-action-bar hidden></div>
</div>

<!-- block 模板（含标题 + step + body） -->
<template id="tpl-confirm-block">
	<section class="container card card--padded block">
		<div class="block__head">
			<h2 class="display-3" data-confirm-block-title></h2>
			<span class="eyebrow" data-confirm-block-step></span>
		</div>
		<div data-confirm-block-body></div>
	</section>
</template>

<!-- 状态条 -->
<template id="tpl-confirm-status-bar">
	<section class="container card card--padded confirm__status-bar">
		<span class="tag tag--accent mono" data-status-order-id></span>
		<span class="mono confirm__time" data-status-time></span>
		<span class="tag tag--danger">待付款</span>
	</section>
</template>

<!-- 地址表单 -->
<template id="tpl-confirm-address-form">
	<div class="confirm__addr">
		<div><dt>收货人</dt><dd><input type="text" class="input" id="addr-name" placeholder="收货人姓名" /></dd></div>
		<div><dt>手机号</dt><dd><input type="tel" class="input" id="addr-phone" placeholder="11 位手机号" maxlength="11" /></dd></div>
		<div class="confirm__addr-wide"><dt>所在地区</dt><dd><input type="text" class="input" id="addr-region" placeholder="省 / 市 / 区" /></dd></div>
		<div class="confirm__addr-wide"><dt>详细地址</dt><dd><input type="text" class="input" id="addr-detail" placeholder="街道 / 门牌号" /></dd></div>
	</div>
	<p class="block__empty">修改后点击底部「提交修改」保存。</p>
</template>

<!-- 配送方式 -->
<template id="tpl-confirm-shipping">
	<p class="confirm__line"><strong data-shipping-label></strong><span class="mono" data-shipping-fee></span></p>
</template>

<!-- 支付方式 -->
<template id="tpl-confirm-pay">
	<p class="confirm__line"><strong data-pay-label></strong></p>
	<p class="block__empty">演示环境不会发起任何真实支付请求。</p>
</template>

<!-- 商品项 -->
<template id="tpl-confirm-order-item">
	<li class="order-item">
		<span class="order-item__art" data-confirm-art></span>
		<span class="order-item__info">
			<span class="order-item__name" data-confirm-name></span>
			<span class="order-item__opt mono" data-confirm-opt></span>
		</span>
		<span class="mono order-item__qty" data-confirm-qty></span>
		<span class="mono order-item__price" data-confirm-price></span>
	</li>
</template>

<!-- 右侧 summary + 操作 -->
<template id="tpl-confirm-summary">
	<div class="summary card card--padded">
		<p class="eyebrow">PAYMENT</p>
		<dl class="summary__list">
			<div><dt>商品金额</dt><dd class="mono" data-summary-subtotal></dd></div>
			<div><dt>优惠券</dt><dd class="mono" data-summary-discount></dd></div>
			<div><dt>运费</dt><dd class="mono" data-summary-shipping></dd></div>
		</dl>
		<div class="summary__total"><span>应付金额</span><span class="price price--lg"><span class="price__sym">¥</span><span data-summary-total></span></span></div>
		<div class="confirm__actions">
			<button type="button" class="btn btn--block" id="btn-edit-order">修改订单</button>
			<button type="button" class="btn btn--primary btn--block" id="btn-confirm-pay">确认购买</button>
		</div>
		<ul class="promise"><li>「修改订单」返回提交订单页，可调整收货信息后重新提交</li><li>「确认购买」模拟完成付款，订单进入待发货状态</li></ul>
	</div>
</template>

<!-- 移动端 action bar -->
<template id="tpl-confirm-action-bar">
	<div class="confirm-action__total">
		<span class="mono confirm-action__hint">应付</span>
		<span class="price price--md"><span class="price__sym">¥</span><span data-action-total></span></span>
	</div>
	<button type="button" class="btn" id="btn-edit-order-m">修改订单</button>
	<button type="button" class="btn btn--primary" id="btn-confirm-pay-m">确认购买</button>
</template>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('plant/js/pages/order-confirm.js')); ?>?v=<?php echo e(time()); ?>"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("plant.layoutplant", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/plant/order-confirm.blade.php ENDPATH**/ ?>