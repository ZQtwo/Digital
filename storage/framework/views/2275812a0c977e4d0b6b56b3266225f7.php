<?php $__env->startSection("adminmain"); ?>
<div id="page-root">
	<div class="admin-head" data-admin-head></div>
	<div class="stat-grid" data-admin-stats></div>
	<div class="admin-toolbar" data-admin-toolbar></div>
	<div class="admin-table-wrap" data-admin-table></div>
	<div class="admin-cards" data-admin-cards></div>
	<div class="admin-table-foot" data-admin-foot></div>
</div>

<!-- admin row -->
<template id="tpl-admin-row">
	<tr data-aid="">
		<td>
			<div style="font-weight:500" data-a-name></div>
			<div class="admin-table__sku" data-a-username></div>
		</td>
		<td data-a-role></td>
		<td data-a-status></td>
		<td class="num" data-a-logincount></td>
		<td><span class="mono" style="font-size: var(--fs-xs)" data-a-lastlogin></span></td>
		<td><span class="mono" style="font-size: var(--fs-xs)" data-a-createdat></span></td>
		<td><div style="display:flex; gap:var(--sp-2); flex-wrap:wrap" data-a-actions></div></td>
	</tr>
</template>

<!-- admin card -->
<template id="tpl-admin-card">
	<article class="admin-card" data-aid="">
		<div class="admin-card__head">
			<div>
				<div class="admin-card__name" data-c-name></div>
				<div class="admin-card__id" data-c-id></div>
			</div>
			<span data-c-role></span>
		</div>
		<dl class="admin-card__meta">
			<dt>状态</dt><dd data-c-status></dd>
			<dt>登录次数</dt><dd data-c-logincount></dd>
			<dt>最后登录</dt><dd data-c-lastlogin></dd>
			<dt>创建</dt><dd data-c-createdat></dd>
		</dl>
		<div class="admin-card__actions" data-c-actions></div>
	</article>
</template>

<!-- admin editor drawer -->
<template id="tpl-admin-editor-drawer">
	<div class="admin-drawer" data-editor-overlay>
		<div class="admin-drawer__panel">
			<div class="admin-drawer__head">
				<div>
					<span class="eyebrow">ADMIN FORM</span>
					<h2 class="display-3" style="margin-top:4px" data-editor-title>新建管理员</h2>
				</div>
				<button type="button" class="icon-btn" aria-label="关闭" data-action="close-editor">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
				</button>
			</div>
			<div class="admin-editor">
				<div class="field"><label class="field__label">用户名</label>
					<input class="field__input" type="text" data-field="username" placeholder="字母数字下划线，2-20 位"></div>
				<div class="field"><label class="field__label">真实姓名</label>
					<input class="field__input" type="text" data-field="realname" placeholder="姓名或昵称"></div>
				<div class="field"><label class="field__label">手机号</label>
					<input class="field__input" type="tel" data-field="phone" placeholder="11 位手机号（必填）" maxlength="11"></div>
				<div class="field"><label class="field__label">角色</label>
					<div class="radio-row" data-role-row></div>
					<p class="admin-editor__hint">超级管理员可管理所有账号；普通管理员负责日常运营。</p></div>
				<div class="field"><label class="field__label">状态</label>
					<select class="field__select" data-field="status"></select></div>
				<div class="field" data-pwd-field hidden><label class="field__label">初始密码</label>
					<input class="field__input" type="password" data-field="password" placeholder="6~20 位，含大小写字母、数字、特殊符号">
					<p class="admin-editor__hint">密码须为 6~20 个字符，且同时包含大小写字母、数字和特殊符号（如 Zxy@13182796613）。</p></div>
			</div>
			<div class="admin-editor__actions">
				<button type="button" class="btn btn--primary" data-action="save-admin" data-editor-submit>创建</button>
				<button type="button" class="btn btn--ghost" data-action="close-editor">取消</button>
			</div>
		</div>
	</div>
</template>

<!-- reset password drawer -->
<template id="tpl-resetpwd-drawer">
	<div class="admin-drawer" data-resetpwd-overlay>
		<div class="admin-drawer__panel">
			<div class="admin-drawer__head">
				<div>
					<span class="eyebrow">RESET PASSWORD</span>
					<h2 class="display-3" style="margin-top:4px" data-rp-title>重置密码</h2>
				</div>
				<button type="button" class="icon-btn" aria-label="关闭" data-action="close-resetpwd">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
				</button>
			</div>
			<div class="admin-editor">
				<div class="field"><label class="field__label">新密码（至少 6 位）</label>
					<input class="field__input" type="password" data-rp="newPwd" placeholder="输入新密码"></div>
				<div class="field"><label class="field__label">确认新密码</label>
					<input class="field__input" type="password" data-rp="confirmPwd" placeholder="再次输入"></div>
			</div>
			<div class="admin-editor__actions">
				<button type="button" class="btn btn--primary" data-action="confirm-resetpwd">确认重置</button>
				<button type="button" class="btn btn--ghost" data-action="close-resetpwd">取消</button>
			</div>
		</div>
	</div>
</template>

<!-- confirm modal -->
<template id="tpl-admin-confirm-modal">
	<div class="confirm-modal" data-confirm-overlay>
		<div class="confirm-modal__card">
			<div class="confirm-modal__title" data-confirm-title></div>
			<p class="confirm-modal__desc" data-confirm-desc></p>
			<div class="confirm-modal__actions">
				<button type="button" class="btn btn--ghost" data-action="cancel-confirm">取消</button>
				<button type="button" class="btn" data-confirm-btn data-action="confirm-confirm" data-aid="">确认</button>
			</div>
		</div>
	</div>
</template>

<!-- alert modal -->
<template id="tpl-admin-alert-modal">
	<div class="confirm-modal" data-alert-overlay>
		<div class="confirm-modal__card">
			<div class="confirm-modal__title" data-alert-title>提示</div>
			<p class="confirm-modal__desc" data-alert-message></p>
			<div class="confirm-modal__actions">
				<button type="button" class="btn btn--primary" data-action="close-alert">知道了</button>
			</div>
		</div>
	</div>
</template>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
	<script src="<?php echo e(asset('admin/js/pages/admins.js')); ?>?v=20261020b"></script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make("admin.layoutadmin", array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/admin/admins.blade.php ENDPATH**/ ?>