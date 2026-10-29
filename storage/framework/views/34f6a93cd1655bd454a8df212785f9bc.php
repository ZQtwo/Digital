

<?php $__env->startSection("plantmain"); ?>
<div id="list-root">
	<div class="list-view container">
		<header class="list__head" data-list-head></header>
		<!-- 移动端筛选+排序 toolbar -->
		<div class="list-mobile-toolbar" data-list-mobile-toolbar></div>
		<div class="split-layout">
			<aside class="split-layout__aside" data-list-filter-panel></aside>
			<div class="list-main" data-list-main>
				<div data-list-desktop-toolbar></div>
				<div data-list-chips></div>
				<div data-list-results></div>
			</div>
		</div>
	</div>
	<!-- 移动端筛选抽屉 -->
	<div class="list-drawer" data-list-drawer hidden></div>
</div>

<!-- Sort chip（用于桌面和移动端） -->
<template id="tpl-sort-chip">
	<button type="button" class="sort-chip" data-action="sort" data-sort=""></button>
</template>

<!-- Filter panel 容器 -->
<template id="tpl-filter-panel">
	<div class="fp">
		<div class="fp__head">
			<span class="eyebrow">FILTER</span>
			<button type="button" class="fp__reset" data-action="reset" hidden></button>
		</div>
		<section class="fp__group">
			<h3 class="fp__title">商品分类</h3>
			<ul class="fp__cats" data-fp-cats></ul>
		</section>
		<section class="fp__group">
			<h3 class="fp__title">品牌</h3>
			<div data-fp-brand></div>
		</section>
		<section class="fp__group">
			<h3 class="fp__title">价格区间</h3>
			<div data-fp-band></div>
		</section>
		<p class="fp__tip">多选下拉点击展开，勾选后即生效</p>
	</div>
</template>

<!-- 分类 cat item -->
<template id="tpl-filter-cat">
	<li>
		<button type="button" class="fp__cat" data-action="set-cat" data-cat="">
			<span data-fp-cat-name></span>
			<span class="fp__cat-count mono" data-fp-cat-count></span>
		</button>
	</li>
</template>

<!-- Active chip -->
<template id="tpl-chip">
	<span class="chip">
		<span data-chip-label></span>
		<button type="button" class="chip__x" data-action="chip-remove" data-patch='{}' aria-label="">
			<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5" /></svg>
		</button>
	</span>
</template>

<!-- Drawer 移动端筛选 -->
<template id="tpl-drawer">
	<div class="drawer" data-action="drawer">
		<div class="drawer__scrim" data-action="close-filter"></div>
		<div class="drawer__panel" role="dialog" aria-modal="true" aria-label="筛选">
			<div class="drawer__head">
				<span class="display-3">筛选</span>
				<button type="button" class="icon-btn" aria-label="关闭筛选" data-action="close-filter">
					<svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 3 L11 11 M11 3 L3 11" /></svg>
				</button>
			</div>
			<div class="drawer__body" data-drawer-body></div>
			<div class="drawer__foot">
				<button type="button" class="btn btn--block" data-action="reset">重置</button>
				<button type="button" class="btn btn--primary btn--block" data-action="close-filter">查看 <span data-drawer-count></span> 件商品</button>
			</div>
		</div>
	</div>
</template>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('plant/js/pages/list.js')); ?>?v=<?php echo e(time()); ?>"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("plant.layoutplant", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/plant/list.blade.php ENDPATH**/ ?>