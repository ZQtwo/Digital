@extends("admin.layoutadmin")

@section("adminmain")
<!-- ========== Dashboard 页面内容 ========== -->
						<div class="admin-stack">

							<!-- 页面头部 -->
							<header class="admin-head">
								<div class="admin-head__text">
									<span class="eyebrow">OVERVIEW</span>
									<h1 class="display-3">库存总览</h1>
									<p class="admin-head__lede" data-bind="overview.lede">在售 — 个 SKU，库存合计 —
										件。本页数据全部来自本地库存状态，任何调整都会实时同步到前台商城。</p>
								</div>
								<a href="/shuma/admin/inventory" class="btn btn--primary btn--sm">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
										stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
										<path d="M12 5v14M5 12h14" />
									</svg>
									去调整库存
								</a>
							</header>

							<!-- KPI 卡（静态骨架，JS 填数值） -->
							<div class="stat-grid" data-bind="kpi"></div>

							<!-- 分类库存量 + 库存占比 -->
							<div class="admin-split">
								<section class="chart-card">
									<div class="chart-card__head">
										<div><span class="eyebrow">STOCK BY CATEGORY</span>
											<h2 class="display-3" style="margin-top:4px">分类库存量</h2>
										</div>
										<div class="chart-legend"><span><i class="chart-legend__dot"></i>库存件数</span>
										</div>
									</div>
									<div class="chart-bars" data-bind="barChart"></div>
								</section>

								<section class="chart-card">
									<div class="chart-card__head">
										<div><span class="eyebrow">SHARE</span>
											<h2 class="display-3" style="margin-top:4px">库存占比</h2>
										</div>
									</div>
									<div class="donut" data-bind="donut"></div>
								</section>
							</div>

							<!-- Top 10 -->
							<section class="chart-card">
								<div class="chart-card__head">
									<div><span class="eyebrow">TOP 10</span>
										<h2 class="display-3" style="margin-top:4px">库存 Top 10</h2>
									</div>
									<a href="/shuma/admin/inventory?sort=stock-desc" class="btn btn--ghost btn--sm">去库存管理 →</a>
								</div>
								<div class="admin-top-list" data-bind="top10"></div>
							</section>

							<!-- 低库存预警 + 最近库存变动 -->
							<div class="admin-split">
								<section class="chart-card">
									<div class="chart-card__head">
										<div><span class="eyebrow">ALERT</span>
											<h2 class="display-3" style="margin-top:4px">低库存预警</h2>
										</div>
										<span class="tag" data-bind="alert.tag"></span>
									</div>
									<div class="alert-list" data-bind="alert.items"></div>
									<p class="admin-note" data-bind="alert.note" hidden></p>
									<a href="/shuma/admin/inventory?status=alert" class="btn btn--ghost btn--sm"
										data-bind="alert.more" hidden style="margin-top:var(--sp-3)"></a>
								</section>

								<section class="chart-card">
									<div class="chart-card__head">
										<div><span class="eyebrow">ACTIVITY</span>
											<h2 class="display-3" style="margin-top:4px">最近库存变动</h2>
										</div>
										<a href="/shuma/admin/logs" class="btn btn--ghost btn--sm">全部流水</a>
									</div>
									<div class="alert-list" data-bind="recent"></div>
									<p class="admin-note" data-bind="recent.note" hidden></p>
								</section>
							</div>

						</div>
						<!-- ========== Dashboard 结束 ========== -->
@endsection

@push('scripts')
	<script src="{{ asset('admin/js/pages/dashboard.js') }}?v=20261021c"></script>
@endpush
