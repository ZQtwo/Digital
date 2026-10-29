@extends("admin.layoutadmin")

@section("adminmain")
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
@endsection

@push('scripts')
	<script src="{{ asset('admin/js/pages/inventory.js') }}?v=20261020a"></script>
@endpush
