@extends("admin.layoutadmin")

@section("adminmain")

@endsection
@push('scripts')
	<script>window.__VOLTA_ADMIN_PAGE__ = 'profile';</script>
	<script src="{{ asset('admin/js/pages/profile.js') }}?v=20261020a"></script>
@endpush
