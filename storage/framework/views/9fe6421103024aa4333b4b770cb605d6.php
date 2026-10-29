<?php $__env->startSection("adminmain"); ?>
<div id="page-root">
	<!-- order-stats 独立骨架：head + KPI + 图表 -->
	<div class="admin-head">
		<span class="eyebrow">ORDER ANALYTICS</span>
		<h1>订单统计</h1>
	</div>
	<div class="stat-grid" data-stats-kpi></div>
	<section class="chart-card" data-stats-status></section>
	<section class="chart-card" data-stats-category></section>
	<section class="chart-card" data-stats-trend></section>
</div>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('admin/js/pages/order-stats.js')); ?>?v=20261021c"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("admin.layoutadmin", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/admin/order-stats.blade.php ENDPATH**/ ?>