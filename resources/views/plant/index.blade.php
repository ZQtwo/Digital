@extends("plant.layoutplant")

@section("plantmain")
<!-- ============ HERO ============ -->
				<section class="hero">
					<div class="container hero__grid">
						<div class="hero__text">
							<p class="eyebrow reveal" data-delay="0">2026 秋季新品 / SPEC-DRIVEN RETAIL</p>
							<h1 class="display-1 hero__title reveal" data-delay="1">参数看得懂，<br />才敢下单。</h1>
							<p class="lede hero__lede reveal" data-delay="2">屏幕、芯片、续航、接口逐项摊开写清楚。VOLTA
								把所有规格摆在明面上，你只需要对着自己的需求打勾。</p>
							<div class="hero__cta reveal" data-delay="3"><a href="/shuma/list"
									class="btn btn--primary">开始选购</a><a href="/shuma/list?sort=sales" class="btn">看热销榜</a>
							</div>
							<dl class="hero__stats reveal" data-delay="4">
								<div>
									<dt class="eyebrow">在售型号</dt>
									<dd class="mono" id="hero-stat-models">—</dd>
								</div>
								<div>
									<dt class="eyebrow">覆盖品类</dt>
									<dd class="mono" id="hero-stat-cats">—</dd>
								</div>
								<div>
									<dt class="eyebrow">平均评分</dt>
									<dd class="mono" id="hero-stat-rating">—</dd>
								</div>
							</dl>
						</div>
						<div class="hero__visual reveal" data-delay="2">
							<div class="hero__art corner-frame" id="hero-art"></div>
							<div class="hero__spec card card--padded" id="hero-spec"></div>
						</div>
					</div>
				</section>

				<!-- ============ CATEGORIES ============ -->
				<section class="section container">
					<header class="section-head">
						<div class="section-head__text"><span class="eyebrow" id="cat-count-label">CATEGORIES</span>
							<h2 class="display-2 section-head__title">按品类找</h2>
						</div>
						<a href="/shuma/list" class="btn btn--sm btn--ghost">查看全部 →</a>
					</header>
					<ul class="cat-grid" id="cat-grid"></ul>
				</section>

				<!-- ============ DEALS ============ -->
				<section class="section container">
					<header class="section-head">
						<div class="section-head__text"><span class="eyebrow">LIMITED OFFER</span>
							<h2 class="display-2 section-head__title">今日限时价</h2>
						</div>
						<div class="countdown" aria-label="距今日结束还有"><span class="countdown__label eyebrow">距结束</span>
							<span class="countdown__unit mono" id="cd-h">09</span><span class="countdown__sep">:</span>
							<span class="countdown__unit mono" id="cd-m">14</span><span class="countdown__sep">:</span>
							<span class="countdown__unit mono" id="cd-s">50</span>
						</div>
					</header>
					<div class="grid-products" id="deals-grid"></div></section>

				<!-- ============ BEST SELLERS ============ -->
				<section class="section container">
					<header class="section-head">
						<div class="section-head__text"><span class="eyebrow">BEST SELLERS</span>
							<h2 class="display-2 section-head__title">本月热销榜</h2>
						</div>
						<a href="/shuma/list?sort=sales" class="btn btn--sm btn--ghost">完整榜单 →</a>
					</header>
					<ol class="rank-list" id="rank-list"></ol>
				</section>

				<!-- ============ FOR YOU (skeleton initial, JS swaps in real data after 620ms) ============ -->
				<section class="section container">
					<header class="section-head">
						<div class="section-head__text"><span class="eyebrow">FOR YOU</span>
							<h2 class="display-2 section-head__title">猜你喜欢</h2>
						</div>
					</header>
					<div class="grid-products"><article class="product-card skeleton-card"><div class="skeleton-card__art"></div><div class="skeleton-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></article><article class="product-card skeleton-card"><div class="skeleton-card__art"></div><div class="skeleton-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></article><article class="product-card skeleton-card"><div class="skeleton-card__art"></div><div class="skeleton-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></article><article class="product-card skeleton-card"><div class="skeleton-card__art"></div><div class="skeleton-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></article><article class="product-card skeleton-card"><div class="skeleton-card__art"></div><div class="skeleton-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></article><article class="product-card skeleton-card"><div class="skeleton-card__art"></div><div class="skeleton-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></article><article class="product-card skeleton-card"><div class="skeleton-card__art"></div><div class="skeleton-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></article><article class="product-card skeleton-card"><div class="skeleton-card__art"></div><div class="skeleton-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--short"></div></div></article></div>
				</section>

				<!-- ============ COUPONS ============ -->
				<section class="section container">
					<header class="section-head">
						<div class="section-head__text"><span class="eyebrow">COUPONS</span>
							<h2 class="display-2 section-head__title">先领券，再下单</h2>
						</div>
					</header>
					<div class="coupon-grid" id="coupon-grid"></section>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/home.js') }}?v=20261021a"></script>
@endpush
