@extends("admin.layoutadmin")

@section("adminmain")
<div id="page-root">
	<div class="admin-head" data-admin-head></div>
	<div class="stat-grid" data-admin-stats></div>
	<div class="admin-toolbar" data-admin-toolbar></div>
	<div class="admin-table-wrap" data-admin-table></div>
	<div class="admin-cards" data-admin-cards></div>
	<div class="admin-table-foot" data-admin-foot></div>
</div>

<template id="tpl-member-row">
	<tr data-mid="">
		<td><div style="font-weight:500" data-m-name></div><div class="admin-table__sku" data-m-id></div></td>
		<td data-m-phone></td>
		<td data-m-level></td>
		<td data-m-status></td>
		<td class="num" style="text-align:right" data-m-spent></td>
		<td class="num" style="text-align:right" data-m-orders></td>
		<td><div style="display:flex; gap:var(--sp-2); flex-wrap:wrap" data-m-actions></div></td>
	</tr>
</template>

<template id="tpl-member-card">
	<article class="admin-card" data-mid="">
		<div class="admin-card__head">
			<div><div class="admin-card__name" data-mc-name></div><div class="admin-card__id" data-mc-id></div></div>
			<span data-mc-level></span>
		</div>
		<dl class="admin-card__meta">
			<dt>手机</dt><dd data-mc-phone></dd>
			<dt>消费</dt><dd data-mc-spent></dd>
			<dt>订单</dt><dd data-mc-orders></dd>
		</dl>
		<div class="admin-card__actions" data-mc-actions></div>
	</article>
</template>

<template id="tpl-member-editor">
	<div class="admin-drawer" data-editor-overlay>
		<div class="admin-drawer__panel">
			<div class="admin-drawer__head">
				<div><span class="eyebrow">MEMBER FORM</span><h2 class="display-3" style="margin-top:4px" data-editor-title>编辑用户</h2></div>
				<button type="button" class="icon-btn" aria-label="关闭" data-action="close-editor"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
			</div>
			<div class="admin-editor">
				<div class="field"><label class="field__label">昵称</label><input class="field__input" type="text" data-field="nickname" placeholder="用户昵称"></div>
				<div class="field"><label class="field__label">手机号</label><input class="field__input" type="tel" data-field="phone" placeholder="11 位手机号" maxlength="11"></div>
				<div class="field"><label class="field__label">等级</label><div class="radio-row" data-level-row></div></div>
				<div class="field"><label class="field__label">状态</label><select class="field__select" data-field="status"><option value="normal">正常</option><option value="frozen">冻结</option><option value="blacklist">黑名单</option></select></div>
			</div>
			<div class="admin-editor__actions">
				<button type="button" class="btn btn--primary" data-action="save-member">保存</button>
				<button type="button" class="btn btn--ghost" data-action="close-editor">取消</button>
			</div>
		</div>
	</div>
</template>

<template id="tpl-admin-confirm-member">
	<div class="confirm-modal" data-confirm-overlay>
		<div class="confirm-modal__card">
			<div class="confirm-modal__title" data-confirm-title></div>
			<p class="confirm-modal__desc" data-confirm-desc></p>
			<div class="confirm-modal__actions">
				<button type="button" class="btn btn--ghost" data-action="cancel-confirm">取消</button>
				<button type="button" class="btn" data-confirm-btn data-action="confirm-confirm" data-mid="">确认</button>
			</div>
		</div>
	</div>
</template>
@endsection

@push('scripts')
	<script src="{{ asset('admin/js/pages/members.js') }}"></script>
@endpush
