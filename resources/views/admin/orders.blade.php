@extends("admin.layoutadmin")

@section("adminmain")
<div id="page-root">
	<div class="admin-head" data-admin-head></div>
	<div class="stat-grid" data-admin-stats></div>
	<div class="order-tabs" data-admin-tabs></div>
	<div class="admin-toolbar" data-admin-toolbar></div>
	<div class="admin-table-wrap" data-admin-table></div>
	<div class="admin-cards" data-admin-cards></div>
	<div class="admin-table-foot" data-admin-foot></div>
</div>
@endsection

@push('scripts')
	<script>window.__VOLTA_ADMIN_PAGE__ = 'orders';</script>
	<script src="{{ asset('admin/js/pages/orders.js') }}?v=20261020a"></script>
@endpush
