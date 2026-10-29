<?php $__env->startPush('scripts'); ?>
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
<?php $__env->stopPush(); ?>

<?php $__env->startSection("plantmain"); ?>
<!-- ========== 页面骨架（HTML 架构） ========== -->
<div id="addresses-root">
	<div class="container page-scoped">
		<!-- 头部：JS 只填标题和返回链接 -->
		<header class="page-head">
			<a class="page-head__back" data-back-href>‹ 返回</a>
			<h1 class="page-head__title" data-title>收货地址</h1>
		</header>
		<!-- 地址卡片列表容器 -->
		<div data-addresses-list></div>
		<!-- 空态 -->
		<div class="empty-state" data-empty-state hidden>
			<div class="empty-state__icon">📍</div>
			<h3 class="empty-state__title">暂无收货地址</h3>
			<p class="empty-state__text">添加一个常用收货地址吧</p>
		</div>
		<!-- 新增按钮 -->
		<button type="button" class="btn btn--block btn--accent addr-add-btn" data-action="add">+ 新增收货地址</button>
	</div>
</div>

<!-- ========== 可复用模板（JS clone + 填数据） ========== -->
<!-- 地址卡片模板 -->
<template id="tpl-addr-card">
	<article class="addr-card card">
		<div class="addr-card__main">
			<div class="addr-card__row">
				<span class="addr-card__name" data-name></span>
				<span class="addr-card__phone mono" data-phone></span>
				<span class="addr-card__default" data-default-tag hidden>默认</span>
			</div>
			<p class="addr-card__region" data-region></p>
			<p class="addr-card__detail" data-detail></p>
		</div>
		<div class="addr-card__actions" data-actions></div>
	</article>
</template>

<!-- 新增/编辑表单模板 -->
<template id="tpl-addr-form">
	<div class="modal-scrim" data-action="close-form">
		<div class="modal-panel addr-form" role="dialog">
			<header class="addr-form__head">
				<h3 data-form-title>新增地址</h3>
				<button type="button" class="addr-form__x" data-action="close-form">×</button>
			</header>
			<div class="addr-form__body">
				<label class="field">
					<span class="field__label">收件人</span>
					<input class="input" data-field="name" placeholder="请输入姓名">
				</label>
				<label class="field">
					<span class="field__label">手机号</span>
					<input class="input" data-field="phone" placeholder="请输入手机号">
				</label>
				<div class="field">
					<span class="field__label">所在地区</span>
					<div class="addr-region" data-mode="manual">
						<div class="addr-region__selects" style="display:none">
							<select class="input select" data-region-level="province"><option value="">请选择</option></select>
							<select class="input select" data-region-level="city"><option value="">请选择</option></select>
							<select class="input select" data-region-level="district"><option value="">请选择</option></select>
						</div>
						<div class="addr-region__manual">
							<input class="input" data-field="region-manual" placeholder="省 / 市 / 区，如：广东省 深圳市 南山区">
						</div>
						<input type="hidden" data-field="region">
					</div>
				</div>
				<label class="field">
					<span class="field__label">详细地址</span>
					<textarea class="textarea" data-field="detail" placeholder="街道、门牌号等"></textarea>
				</label>
				<label class="addr-form__check">
					<input type="checkbox" data-field="is-default"> 设为默认地址
				</label>
			</div>
			<footer class="addr-form__foot">
				<button type="button" class="btn btn--outline" data-action="close-form">取消</button>
				<button type="button" class="btn btn--accent" data-action="save-form">保存</button>
			</footer>
		</div>
	</div>
</template>

<!-- 删除确认弹窗模板 -->
<template id="tpl-addr-delete">
	<div class="modal-scrim">
		<div class="modal-panel" role="dialog" style="max-width:420px">
			<header class="addr-form__head"><h3>删除地址</h3></header>
			<div class="addr-form__body"><p style="margin:0">确认删除这个地址？</p></div>
			<footer class="addr-form__foot">
				<button type="button" class="btn btn--outline" data-action="cancel">取消</button>
				<button type="button" class="btn btn--accent" data-action="ok">确认</button>
			</footer>
		</div>
	</div>
</template>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('plant/js/pages/addresses.js')); ?>?v=<?php echo e(time()); ?>"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("plant.layoutplant", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/plant/addresses.blade.php ENDPATH**/ ?>