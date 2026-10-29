<?php $__env->startSection("adminmain"); ?>
<div id="page-root">
	<!-- product-create 用 template clone，外层容器即可 -->
</div>
<template id="tpl-product-create">
	<div class="admin-head">
		<div class="admin-head__text">
			<span class="eyebrow">PRODUCT CREATE</span>
			<h1 class="display-3">商品发布</h1>
			<p class="lede" style="font-size: var(--fs-sm)">填写商品基础信息，提交后进入商品列表并自动初始化库存记录。</p>
		</div>
	</div>

	<div class="pc-form">
		<!-- 基础信息 -->
		<div class="pc-section">
			<!-- 商品名称 -->
			<div class="field" data-field-wrap="name">
				<label class="field__label">商品名称 *</label>
				<input class="field__input" type="text" data-field="name" placeholder="例：VOLTA X9 Pro 旗舰影像手机">
				<p class="field__error" data-error-for="name"></p>
			</div>

			<!-- 品牌 + 分类 -->
			<div class="pc-form__row">
				<div class="field">
					<label class="field__label">品牌 *</label>
					<select class="field__select" data-field="brand"></select>
				</div>
				<div class="field">
					<label class="field__label">分类 *</label>
					<select class="field__select" data-field="category"></select>
				</div>
			</div>

			<!-- 标签 -->
			<div class="field">
				<label class="field__label">标签（逗号分隔，至多 3 个）</label>
				<input class="field__input" type="text" data-field="tags" placeholder="例：旗舰芯, 一英寸主摄, 120W 快充">
			</div>

			<!-- 描述 -->
			<div class="field">
				<label class="field__label">商品描述</label>
				<textarea class="field__textarea" data-field="description"
					placeholder="详细描述商品的卖点、配置与适用场景..."></textarea>
			</div>
		</div>

		<!-- 价格与库存 -->
		<div class="pc-section">
			<div class="pc-form__row3">
				<div class="field" data-field-wrap="price">
					<label class="field__label">售价 (¥) *</label>
					<input class="field__input" type="number" min="0" step="1" data-field="price">
					<p class="field__error" data-error-for="price"></p>
				</div>
				<div class="field" data-field-wrap="listPrice">
					<label class="field__label">划线价 (¥)</label>
					<input class="field__input" type="number" min="0" step="1" data-field="listPrice">
					<p class="field__error" data-error-for="listPrice"></p>
				</div>
				<div class="field" data-field-wrap="stock">
					<label class="field__label">初始库存</label>
					<input class="field__input" type="number" min="0" step="1" data-field="stock"
						placeholder="留空则用商品默认值">
					<p class="field__error" data-error-for="stock"></p>
				</div>
			</div>
		</div>

		<!-- 媒体素材 -->
		<div class="pc-section">
			<!-- 图片上传 -->
			<div class="field">
				<label class="field__label">商品图片（最多 5 张）</label>
				<div class="pc-gallery" data-gallery></div>
				<p class="pc-media-note">单张压缩后 ≤ <strong>400KB</strong>，支持 JPG / PNG / WebP / GIF。</p>
				<input type="file" accept="image/*" multiple hidden data-gallery-input>
			</div>

			<!-- 视频上传 -->
			<div class="field">
				<label class="field__label">商品视频（最多 1 段）</label>
				<div class="pc-video-slot" data-video-slot>
					<div class="pc-gallery__hint">
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
							<rect x="2" y="5" width="20" height="14" rx="2" />
							<path d="m10 9 5 3-5 3V9z" fill="currentColor" />
						</svg>
						点击上传视频
					</div>
				</div>
				<p class="pc-media-note">单段 ≤ <strong>1.5MB</strong>，支持 MP4 / WebM / MOV。</p>
				<input type="file" accept="video/*" hidden data-video-input>
			</div>
		</div>

		<!-- 实时预览 -->
		<div class="pc-section">
			<div class="pc-preview" data-preview>
				<div class="pc-preview__title">PREVIEW</div>
				<div class="pc-preview__name" data-preview-name>商品名称占位</div>
				<div class="pc-preview__price" data-preview-price>¥0.00</div>
				<div class="pc-preview__desc" data-preview-desc>商品描述将显示在这里...</div>
			</div>
		</div>

		<!-- 操作按钮 -->
		<div class="pc-form__actions">
			<button type="button" class="btn btn--primary" data-action="submit">提交发布</button>
			<button type="button" class="btn btn--ghost" data-action="reset">重置表单</button>
			<a href="/shuma/admin/products" class="btn btn--ghost">取消</a>
		</div>
		<p class="admin-note">提交后会调用 Volta.Products.add 写入商品，并可在「商品管理」中编辑或删除。库存可在「库存管理」页后续调整。</p>
	</div>
</template>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('admin/js/pages/product-create.js')); ?>?v=20261020b"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("admin.layoutadmin", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/admin/product-create.blade.php ENDPATH**/ ?>