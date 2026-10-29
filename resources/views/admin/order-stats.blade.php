@extends("admin.layoutadmin")

@section("adminmain")
<div id="page-root">
	<!-- order-stats 独立骨架：head + KPI + 图表 -->
	<div class="admin-head">
		<span class="eyebrow">ORDER ANALYTICS</span>
		<h1>订单统计</h1>
	</div>
	<div class="stat-grid" data-stats-kpi></div>
	<section class="chart-card" data-stats-status></section>
	<section class="chart-card" data-stats-category></section>
	<section class="chart-card" data-stats-trend></section>
</div>
@endsection

@push('scripts')
	<script src="{{ asset('admin/js/pages/order-stats.js') }}?v=20261021c"></script>
@endpush
