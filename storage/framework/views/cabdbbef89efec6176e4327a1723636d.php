

<?php $__env->startPush('scripts'); ?>
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
<?php $__env->stopPush(); ?>

<?php $__env->startSection("plantmain"); ?>
<div id="profile-root">
	<div class="container profile">
		<section class="card card--padded profile__head" data-profile-head></section>
		<section class="card profile__assets" data-profile-assets></section>
		<section class="profile__block" data-profile-orders></section>
		<section class="profile__block" data-profile-coupons></section>
		<nav class="card profile__list" data-profile-tools></nav>
		<button type="button" class="btn btn--block btn--danger profile__logout" data-action="logout">退出登录</button>
	</div>
</div>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('plant/js/pages/profile.js')); ?>?v=<?php echo e(time()); ?>"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("plant.layoutplant", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/plant/profile.blade.php ENDPATH**/ ?>