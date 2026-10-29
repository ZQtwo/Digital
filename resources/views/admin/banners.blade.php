@extends("admin.layoutadmin")

@section("adminmain")
<div id="page-root">
	<div class="admin-head" data-admin-head></div>
	<div class="stat-grid" data-admin-stats></div>
	<div class="admin-toolbar" data-admin-toolbar></div>
	<div class="admin-table-wrap" data-admin-table></div>
	<div class="admin-cards" data-admin-cards></div>
</div>
@endsection

@push('scripts')
	<script>window.__VOLTA_ADMIN_PAGE__ = 'banners';</script>
	<script src="{{ asset('admin/js/pages/banners.js') }}?v=20261021a"></script>
@endpush
