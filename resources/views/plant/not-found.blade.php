@extends("plant.layoutplant")

@section("plantmain")
<div class="nf container">
					<div class="nf__art corner-frame reveal" data-delay="0"><svg class="product-art"
							viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="页面不存在示意图">
							<defs>
								<linearGradient id="pa-nf-1-g" x1="0" y1="0" x2="1" y2="1">
									<stop offset="0" stop-color="var(--art-bg-1)" />
									<stop offset="1" stop-color="var(--art-bg-2)" />
								</linearGradient>
								<radialGradient id="pa-nf-1-gl">
									<stop offset="0" stop-color="var(--c-accent)" stop-opacity="0.3" />
									<stop offset="1" stop-color="var(--c-accent)" stop-opacity="0" />
								</radialGradient>
							</defs>
							<rect width="320" height="220" fill="url(#pa-nf-1-g)" />
							<g class="art-grid" transform="translate(3 0)">
								<line x1="0" y1="0" x2="0" y2="220" />
								<line x1="32" y1="0" x2="32" y2="220" />
								<line x1="64" y1="0" x2="64" y2="220" />
								<line x1="96" y1="0" x2="96" y2="220" />
								<line x1="128" y1="0" x2="128" y2="220" />
								<line x1="160" y1="0" x2="160" y2="220" />
								<line x1="192" y1="0" x2="192" y2="220" />
								<line x1="224" y1="0" x2="224" y2="220" />
								<line x1="256" y1="0" x2="256" y2="220" />
								<line x1="288" y1="0" x2="288" y2="220" />
								<line x1="0" y1="0" x2="320" y2="0" />
								<line x1="0" y1="32" x2="320" y2="32" />
								<line x1="0" y1="64" x2="320" y2="64" />
								<line x1="0" y1="96" x2="320" y2="96" />
								<line x1="0" y1="128" x2="320" y2="128" />
								<line x1="0" y1="160" x2="320" y2="160" />
								<line x1="0" y1="192" x2="320" y2="192" />
							</g>
							<ellipse fill="url(#pa-nf-1-gl)" cx="125" cy="105" rx="130" ry="86" />
							<g class="art-marks">
								<path d="M14 26 V14 H26" />
								<path d="M294 14 H306 V26" />
								<path d="M306 194 V206 H294" />
								<path d="M26 206 H14 V194" />
							</g>
							<g class="art-body">
								<rect x="110" y="62" width="100" height="96" rx="12" class="art-ink" />
								<circle cx="160" cy="110" r="18" class="art-accent" />
							</g>
						</svg></div>
					<div class="nf__text">
						<span class="eyebrow reveal" data-delay="1">ERROR 404</span>
						<h1 class="display-1 nf__code reveal" data-delay="2">404</h1>
						<p class="lede reveal" data-delay="3">这个地址下没有内容。可能是链接失效，或者商品已经下架。</p>
						<div class="nf__links reveal" data-delay="4">
							<a href="/shuma/" class="btn btn--sm">返回首页</a>
							<a href="/shuma/list" class="btn btn--sm">全部商品</a>
							<a href="/shuma/cart" class="btn btn--sm">购物车</a>
							<a href="/shuma/my-orders" class="btn btn--sm">我的订单</a>
						</div>
					</div>
				</div>
@endsection

@push('scripts')
	<script src="{{ asset('plant/js/pages/not-found.js') }}"></script>
@endpush
