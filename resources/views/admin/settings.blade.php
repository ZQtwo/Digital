@extends("admin.layoutadmin")

@section("adminmain")
<div id="page-root">
	<!-- settings 独立骨架：不用 stat-grid/toolbar/table -->
	<div class="admin-head">SYSTEM<span>系统设置</span></div>
	<div class="settings-form">
		<section class="chart-card" data-settings-site></section>
		<section class="chart-card" data-settings-ui></section>
		<section class="chart-card" data-settings-notify></section>
		<section class="chart-card" data-settings-password></section>
		<section class="chart-card" data-settings-data></section>
		<section class="chart-card" data-settings-about></section>
		<div class="settings-form__actions">
			<button type="button" class="btn btn--outline" data-action="reset-default">恢复默认</button>
			<button type="button" class="btn btn--accent" data-action="save-settings">保存设置</button>
		</div>
	</div>
</div>
@endsection

@push('scripts')
	<script>window.__VOLTA_ADMIN_PAGE__ = 'settings';</script>
	<script src="{{ asset('admin/js/pages/settings.js') }}?v=20261020a"></script>
@endpush
