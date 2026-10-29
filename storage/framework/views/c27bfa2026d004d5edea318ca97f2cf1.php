

<?php $__env->startPush('scripts'); ?>
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
<?php $__env->stopPush(); ?>

<?php $__env->startSection("plantmain"); ?>
<div id="detail-root">
	<div class="container confirm" data-detail-main hidden>
		<header class="confirm__head">
			<span class="eyebrow">ORDER DETAIL</span>
			<h1 class="display-2">订单详情</h1>
		</header>
		<div class="confirm__layout">
			<div class="confirm__main">
				<div data-detail-status-bar></div>
				<section class="container card card--padded block">
					<div class="block__head"><h2 class="display-3">收货信息</h2><span class="eyebrow">STEP 01</span></div>
					<div class="confirm__addr" data-detail-address></div>
				</section>
				<section class="container card card--padded block">
					<div class="block__head"><h2 class="display-3">支付方式</h2><span class="eyebrow">STEP 02</span></div>
					<p class="confirm__line" data-detail-pay-method></p>
				</section>
				<section class="container card card--padded block">
					<div class="block__head"><h2 class="display-3">商品清单</h2><span class="eyebrow">STEP 03</span></div>
					<ul class="order-items" data-detail-items></ul>
				</section>
			</div>
			<aside class="card card--padded summary" data-detail-summary></aside>
		</div>
	</div>
	<div class="container" data-detail-empty hidden>
		<p class="block__empty">订单不存在或已删除。</p>
		<a href="/shuma/orders" class="btn btn--primary">返回订单列表</a>
	</div>
</div>

<template id="tpl-detail-status-bar">
	<section class="container card card--padded confirm__status-bar">
		<span class="tag tag--accent mono" data-order-no></span>
		<span class="mono confirm__time" data-order-time></span>
		<span class="tag" data-order-status-tag></span>
	</section>
</template>

<!-- Order detail item（图片/名称可点击跳商品详情，任何订单状态都可查看） -->
<template id="tpl-detail-order-item">
	<li class="order-item">
		<a class="order-item__art" data-art href=""></a>
		<span class="order-item__info">
			<a class="order-item__name" data-name href=""></a>
			<span class="order-item__opt mono" data-opt></span>
		</span>
		<span class="mono order-item__qty">×<span data-qty></span></span>
		<span class="mono order-item__price" data-price></span>
	</li>
</template>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('plant/js/pages/order-detail.js')); ?>?v=<?php echo e(time()); ?>"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("plant.layoutplant", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/plant/order-detail.blade.php ENDPATH**/ ?>