@extends("plant.layoutplant")

@push('scripts')
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
@endpush

@section("plantmain")
<div id="profile-root">
	<div class="container profile">
		<section class="card card--padded profile__head" data-profile-head></section>
		<section class="card profile__assets" data-profile-assets></section>
		<section class="profile__block" data-profile-orders></section>
		<section class="profile__block" data-profile-coupons></section>
		<nav class="card profile__list" data-profile-tools></nav>
		<button type="button" class="btn btn--block btn--danger profile__logout" data-action="logout">退出登录</button>
	</div>
</div>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/profile.js') }}?v={{ time() }}"></script>
@endpush
