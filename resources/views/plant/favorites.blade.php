@extends("plant.layoutplant")

@push('scripts')
<script>Volta.Auth && Volta.Auth.requireLogin();</script>
@endpush

@section("plantmain")
<!-- 外层静态容器（SSR），内层列表由 favorites.js 填数据 -->
<div class="container favorites" id="favorites-root">
	<header class="favorites__head">
		<div>
			<span class="eyebrow">FAVORITES</span>
			<h1 class="display-2">我的收藏</h1>
			<p class="mono favorites__count" data-empty-hidden>N 件商品</p>
		</div>
		<button type="button" class="btn btn--sm btn--ghost favorites__clear" data-action="clear-all" data-empty-hidden>清空收藏</button>
	</header>
	<div class="grid-products" data-favorites-list></div>
</div>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/favorites.js') }}"></script>
@endpush
