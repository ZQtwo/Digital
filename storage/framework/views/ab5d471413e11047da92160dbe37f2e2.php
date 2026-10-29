<?php $__env->startSection("adminmain"); ?>
<div id="page-root">
	<div class="admin-stack">
		<div class="admin-head" data-admin-head></div>
		<div class="admin-toolbar" data-admin-toolbar></div>
		<div data-admin-batch-bar></div>
		<div class="admin-table-wrap" data-admin-table></div>
		<div class="admin-mobile-cards" data-admin-mobile></div>
		<div class="admin-table-foot" data-admin-footer></div>
	</div>
</div>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('admin/js/pages/inventory.js')); ?>?v=20261020a"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("admin.layoutadmin", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/admin/inventory.blade.php ENDPATH**/ ?>