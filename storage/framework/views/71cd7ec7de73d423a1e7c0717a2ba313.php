<?php $__env->startSection("adminmain"); ?>
<div id="page-root">
	<!-- admin 通用骨架 -->
	<div class="admin-head" data-admin-head></div>
	<div class="stat-grid" data-admin-stats></div>
	<div class="admin-toolbar" data-admin-toolbar></div>
	<div class="admin-table-wrap" data-admin-table></div>
	<div class="admin-cards" data-admin-cards></div>
	<div class="admin-table-foot" data-admin-foot></div>
</div>

<!-- 商品表格行 -->
<template id="tpl-prod-row">
	<tr data-pid="">
		<td>
			<div style="font-weight:500" data-prod-name></div>
			<div class="admin-table__sku" data-prod-sku></div>
		</td>
		<td data-prod-cat></td>
		<td data-prod-brand></td>
		<td class="num" style="text-align:right" data-prod-price></td>
		<td class="num" style="text-align:right" data-prod-original></td>
		<td class="num" style="text-align:right" data-prod-stock></td>
		<td>
			<div style="display:flex; gap:var(--sp-2); flex-wrap:wrap">
				<button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-pid="">编辑</button>
				<button type="button" class="btn btn--ghost btn--sm" style="color: var(--c-danger)" data-action="delete" data-pid="">删除</button>
			</div>
		</td>
	</tr>
</template>

<!-- 商品卡片（移动端） -->
<template id="tpl-prod-card">
	<article class="admin-card" data-pid="">
		<div class="admin-card__head">
			<div>
				<div class="admin-card__name" data-card-name></div>
				<div class="admin-card__id" data-card-id></div>
			</div>
		</div>
		<dl class="admin-card__meta">
			<dt>分类</dt><dd data-card-cat></dd>
			<dt>售价</dt><dd data-card-price></dd>
			<dt>库存</dt><dd data-card-stock></dd>
		</dl>
		<div class="admin-card__actions">
			<button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-pid="">编辑</button>
			<button type="button" class="btn btn--ghost btn--sm" style="color: var(--c-danger)" data-action="delete" data-pid="">删除</button>
		</div>
	</article>
</template>

<!-- Editor Drawer -->
<template id="tpl-admin-editor">
	<div class="admin-drawer" data-editor-overlay>
		<div class="admin-drawer__panel">
			<div class="admin-drawer__head">
				<div>
					<span class="eyebrow">PRODUCT FORM</span>
					<h2 class="display-3" style="margin-top:4px" data-editor-title>新增商品</h2>
				</div>
				<button type="button" class="icon-btn" aria-label="关闭" data-action="close-editor">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
				</button>
			</div>
			<div class="admin-editor">
				<div class="field"><label class="field__label">商品名称</label>
					<input class="field__input" type="text" data-field="name" placeholder="请输入商品名称"></div>
				<div class="field"><label class="field__label">分类</label>
					<select class="field__select" data-field="category"></select></div>
				<div class="field"><label class="field__label">品牌</label>
					<select class="field__select" data-field="brand"><option value="">请选择</option></select></div>
				<div class="field"><label class="field__label">售价（元）</label>
					<input class="field__input" type="number" step="0.01" data-field="price" placeholder="0.00"></div>
				<div class="field"><label class="field__label">划线价（元，选填）</label>
					<input class="field__input" type="number" step="0.01" data-field="originalPrice" placeholder="原价"></div>
				<div class="field"><label class="field__label">商品描述（选填）</label>
					<textarea class="field__input" data-field="desc" rows="4"></textarea></div>
			</div>
			<div class="admin-editor__actions">
				<button type="button" class="btn btn--primary" data-action="save" data-save-label>创建商品</button>
				<button type="button" class="btn btn--ghost" data-action="close-editor">取消</button>
			</div>
		</div>
	</div>
</template>

<!-- Confirm Modal -->
<template id="tpl-admin-confirm">
	<div class="confirm-modal" data-confirm-overlay>
		<div class="confirm-modal__card">
			<div class="confirm-modal__title">删除商品？</div>
			<p class="confirm-modal__desc" data-confirm-desc></p>
			<div class="confirm-modal__actions">
				<button type="button" class="btn btn--ghost" data-action="cancel-delete">取消</button>
				<button type="button" class="btn" style="background: var(--c-danger); color: #fff; border-color: var(--c-danger)" data-action="confirm-delete" data-pid="">确认删除</button>
			</div>
		</div>
	</div>
</template>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script>window.__VOLTA_ADMIN_PAGE__ = 'products';</script>
	<script src="<?php echo e(asset('admin/js/pages/products.js')); ?>?v=20261022b"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("admin.layoutadmin", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/admin/products.blade.php ENDPATH**/ ?>