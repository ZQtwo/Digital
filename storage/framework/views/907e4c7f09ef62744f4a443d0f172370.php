

<?php $__env->startSection("plantmain"); ?>
<div id="product-root">
	<!-- 非空态骨架 -->
	<div class="detail container" data-detail-main hidden>
		<nav data-detail-crumb></nav>
		<div class="detail__top" data-detail-top>
			<div data-detail-gallery></div>
			<div data-detail-buybox></div>
		</div>
		<div class="detail__tabs">
			<div data-detail-tabs></div>
			<div data-detail-tab-panel></div>
		</div>
	</div>
	<!-- 空态 -->
	<div data-product-empty hidden></div>
	<!-- 移动端 action bar -->
	<div class="action-bar detail-action" data-product-action-bar hidden></div>
</div>

<!-- Tab button -->
<template id="tpl-detail-tab">
	<button type="button" role="tab" class="tabs__btn" data-action="switch-tab" data-tab="" aria-selected="false"></button>
</template>

<!-- Gallery thumb -->
<template id="tpl-gallery-thumb">
	<li>
		<button type="button" class="gallery__thumb" data-action="switch-view" data-view="" aria-label="" aria-pressed="false"></button>
	</li>
</template>

<!-- Service bullet -->
<template id="tpl-service-item">
	<li>
		<span class="services__tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 L5 8.6 L9.5 3.6" /></svg></span>
		<span><strong data-service-title></strong><em data-service-desc></em></span>
	</li>
</template>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('plant/js/pages/product.js')); ?>?v=20261022b"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("plant.layoutplant", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/plant/product.blade.php ENDPATH**/ ?>