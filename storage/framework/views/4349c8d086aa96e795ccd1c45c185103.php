<?php $__env->startSection("adminmain"); ?>
<div id="page-root">
	<div class="admin-head" data-admin-head></div>
	<div class="stat-grid" data-admin-stats></div>
	<div class="admin-toolbar" data-admin-toolbar></div>
	<div class="admin-table-wrap" data-admin-table></div>
	<div class="admin-cards" data-admin-cards></div>
	<div class="admin-table-foot" data-admin-foot></div>
</div>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script>window.__VOLTA_ADMIN_PAGE__ = 'categories';</script>
	<script src="<?php echo e(asset('admin/js/pages/categories.js')); ?>?v=<?php echo e(time()); ?>"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("admin.layoutadmin", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/admin/categories.blade.php ENDPATH**/ ?>