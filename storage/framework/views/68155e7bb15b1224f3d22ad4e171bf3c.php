<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
		<meta name="theme-color" content="#08090C">
		<title>VOLTA 数码商城</title>
		<!-- 样式：令牌 → 基线 → 骨架 → 公共组件 -->
		<link href="/plant/images/volta_logo.png?v=20261020" rel="icon">
		<link href="/plant/images/volta_logo.png?v=20261020" rel="shortcut icon">
		<link rel="stylesheet" href="<?php echo e(asset('plant/css/tokens.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('plant/css/base.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('plant/css/layout.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('plant/css/components.css')); ?>?v=<?php echo e(time()); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('plant/css/pages.css')); ?>">
	</head>
	<body>
		<div class="app-shell atmosphere">
			<a class="skip-link" href="#main">跳到主要内容</a>

			<header class="site-header">
				<div class="container site-header__bar">
					<a href="<?php echo e(url('/shuma/index')); ?>" class="brand" aria-label="VOLTA 数码商城 首页">
						<span class="brand__mark" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24"
								fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
								stroke-linejoin="round" aria-hidden="true">
								<path d="M13 2 L4.5 13.5 H11 L10 22 L19.5 10 H13 Z" />
							</svg></span>
						<span class="brand__text"
							style="display:inline-flex;align-items:baseline;gap:8px;white-space:nowrap;"><span
								class="brand__name" style="display:inline;">VOLTA</span><span class="brand__sub"
								style="display:inline;">DIGITAL STORE</span></span>
					</a>
					<nav class="site-nav" aria-label="主导航">
						<a href="<?php echo e(url('/shuma/index')); ?>" class="site-nav__link <?php echo e(request()->is('shuma/index','shuma') ? 'is-active' : ''); ?>">首页</a>
						<a href="<?php echo e(url('/shuma/list')); ?>" class="site-nav__link <?php echo e(request()->is('shuma/list') ? 'is-active' : ''); ?>">全部商品</a>
						<a href="<?php echo e(url('/shuma/list')); ?>?cat=phone" class="site-nav__link">手机通讯</a>
						<a href="<?php echo e(url('/shuma/list')); ?>?cat=audio" class="site-nav__link">影音娱乐</a>
						<a href="<?php echo e(url('/shuma/my-orders')); ?>" class="site-nav__link <?php echo e(request()->is('shuma/my-orders') ? 'is-active' : ''); ?>">我的订单</a>
					</nav>
					<div class="header-search">
						<div data-mount="search-box" data-mode="header"></div>
					</div>
					<div class="header-actions">
						<button type="button" class="icon-btn mobile-only" aria-expanded="false" aria-label="搜索"
							data-action="toggle-mobile-search"><svg width="19" height="19" viewBox="0 0 24 24"
								fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
								aria-hidden="true">
								<circle cx="10.5" cy="10.5" r="6.5" />
								<path d="M15.5 15.5 L21 21" />
							</svg></button>
						<button type="button" class="icon-btn" aria-label="切换到夜间模式" data-action="toggle-theme"><svg
								width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
								style="display:block;">
								<circle cx="12" cy="12" r="4.2" />
								<path
									d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
							</svg></button>
						<a href="<?php echo e(url('/shuma/my-favorites')); ?>" class="icon-btn" aria-label="我的收藏"><svg width="18" height="18"
								viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
								stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
								style="transform:translateY(-2px);display:block;">
								<path d="M12 20.3l-6.6-6.5a4.2 4.2 0 1 1 6-5.9l.6.6.6-.6a4.2 4.2 0 1 1 6 5.9z" />
							</svg></a>
						<a href="<?php echo e(url('/shuma/cart')); ?>" class="icon-btn" aria-label="购物车"><svg width="19" height="19"
								viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
								stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
								style="display:block;">
								<path d="M3 4h2.2l2.1 10.6h10.9l1.8-7H6" />
								<circle cx="9.5" cy="19.5" r="1.3" />
								<circle cx="17" cy="19.5" r="1.3" />
							</svg></a>
						<div class="user-area desktop-only"><a href="<?php echo e(url('/shuma/login')); ?>"
								class="btn btn--sm btn--outline-accent">登录</a></div>
					</div>
				</div>
				<div class="mobile-search" style="display:none">
					<div class="container">
						<div data-mount="search-box" data-mode="mobile"></div>
					</div>
				</div>
			</header>

			<main id="main" class="app-main">
				<?php echo $__env->yieldContent('plantmain'); ?>
			</main>

			<footer class="site-footer">
				<div class="container site-footer__grid">
					<div class="site-footer__col">
						<div class="brand" style="margin-bottom: var(--sp-3)">
							<span class="brand__mark" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24"
									fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
									stroke-linejoin="round" aria-hidden="true">
									<path d="M13 2 L4.5 13.5 H11 L10 22 L19.5 10 H13 Z" />
								</svg></span>
							<span class="brand__name">VOLTA</span>
						</div>
						<p class="footer-note">本页面为前端演示项目：商品、品牌、评价、订单均为虚构数据，所有操作只在浏览器本地生效，不涉及真实交易、支付与账号。</p>
					</div>
					<div class="site-footer__col">
						<h3>选购</h3>
						<ul>
							<li><a href="<?php echo e(url('/shuma/list')); ?>">全部商品</a></li>
							<li><a href="<?php echo e(url('/shuma/list')); ?>?cat=phone">手机通讯</a></li>
							<li><a href="<?php echo e(url('/shuma/list')); ?>?cat=computer">电脑整机</a></li>
							<li><a href="<?php echo e(url('/shuma/list')); ?>?cat=audio">影音娱乐</a></li>
						</ul>
					</div>
					<div class="site-footer__col">
						<h3>账户</h3>
						<ul>
							<li><a href="<?php echo e(url('/shuma/login')); ?>">登录 / 注册</a></li>
							<li><a href="<?php echo e(url('/shuma/my-orders')); ?>">我的订单</a></li>
							<li><a href="<?php echo e(url('/shuma/my-favorites')); ?>">我的收藏</a></li>
							<li><a href="<?php echo e(url('/shuma/cart')); ?>">购物车</a></li>
						</ul>
					</div>
					<div class="site-footer__col">
						<h3>服务</h3>
						<ul>
							<li><a href="<?php echo e(url('/shuma/list')); ?>">七天无理由退货</a></li>
							<li><a href="<?php echo e(url('/shuma/list')); ?>">全国联保</a></li>
							<li><a href="<?php echo e(url('/shuma/list')); ?>">顺丰包邮</a></li>
							<li><a href="<?php echo e(url('/shuma/list')); ?>">价格保护</a></li>
						</ul>
					</div>
				</div>
				<div class="container site-footer__bottom">
					<span>© 2026 VOLTA DIGITAL STORE · DEMO</span>
					<span>纯前端演示 · 数据保存在本地浏览器</span>
				</div>
			</footer>

			<nav class="tabbar" aria-label="底部导航">
				<a href="<?php echo e(url('/shuma/index')); ?>" class="tabbar__item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"
						stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
						aria-hidden="true" style="display:block;">
						<path d="M4 10.5 L12 3.5 L20 10.5 V20 H4 Z" />
						<path d="M9.5 20 V14 H14.5 V20" />
					</svg><span>首页</span></a>
				<a href="<?php echo e(url('/shuma/list')); ?>" class="tabbar__item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"
						stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
						aria-hidden="true" style="display:block;">
						<rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
						<rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
						<rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
						<rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
					</svg><span>分类</span></a>
				<a href="<?php echo e(url('/shuma/my-favorites')); ?>" class="tabbar__item"><svg width="20" height="20" viewBox="0 0 24 24"
						fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
						stroke-linejoin="round" aria-hidden="true" style="transform:translateY(-2px);display:block;">
						<path d="M12 20.3l-6.6-6.5a4.2 4.2 0 1 1 6-5.9l.6.6.6-.6a4.2 4.2 0 1 1 6 5.9z" />
					</svg><span>收藏</span></a>
				<a href="<?php echo e(url('/shuma/cart')); ?>" class="tabbar__item" aria-current="page"><svg width="20" height="20"
						viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
						stroke-linejoin="round" aria-hidden="true" style="display:block;">
						<path d="M3 4h2.2l2.1 10.6h10.9l1.8-7H6" />
						<circle cx="9.5" cy="19.5" r="1.3" />
						<circle cx="17" cy="19.5" r="1.3" />
					</svg><span>购物车</span><span class="tabbar__badge" style="display:none">0</span></a>
				<a href="<?php echo e(url('/shuma/profile')); ?>" class="tabbar__item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"
						stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
						aria-hidden="true" style="display:block;">
						<circle cx="12" cy="8.5" r="3.8" />
						<path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
					</svg><span>我的</span></a>
			</nav>
			<div class="toast-host" role="status" aria-live="polite"></div>
			<button type="button" class="back-to-top" aria-label="回到顶部" style="display:none">↑</button>
		</div>

		<!-- jQuery -->
		<script src="<?php echo e(asset('plant/js/vendor/jquery.min.js')); ?>"></script>
		<!-- 基础库 -->
		<script src="<?php echo e(asset('plant/js/core/storage.js')); ?>"></script>
		<script src="<?php echo e(asset('plant/js/core/format.js')); ?>?v=<?php echo e(time()); ?>"></script>
		<script src="<?php echo e(asset('plant/js/core/regions.js')); ?>?v=<?php echo e(time()); ?>"></script>
		<script src="<?php echo e(asset('plant/js/core/data.js')); ?>?v=<?php echo e(time()); ?>"></script>
		<!-- 新数据层：api.js → store.js → bootstrap-data.js -->
		<script src="<?php echo e(asset('plant/js/core/api.js')); ?>?v=<?php echo e(time()); ?>"></script>
		<script src="<?php echo e(asset('plant/js/core/store.js')); ?>?v=20261022a"></script>
		<script src="<?php echo e(asset('plant/js/core/bootstrap-data.js')); ?>?v=20261022a"></script>
		<script src="<?php echo e(asset('plant/js/core/store-ui.js')); ?>"></script>
		<script src="<?php echo e(asset('plant/js/core/store-user.js')); ?>?v=<?php echo e(time()); ?>"></script>
		<script src="<?php echo e(asset('plant/js/core/store-inventory.js')); ?>?v=20261019f"></script>
		<script src="<?php echo e(asset('plant/js/core/store-cart.js')); ?>?v=20261019f"></script>
		<script src="<?php echo e(asset('plant/js/core/reveal.js')); ?>"></script>
		<script src="<?php echo e(asset('plant/js/core/auth.js')); ?>?v=20261019n"></script>
		<script src="<?php echo e(asset('plant/js/core/product-art.js')); ?>"></script>
		<script src="<?php echo e(asset('plant/js/core/components.js')); ?>?v=20261019n"></script>
		<script src="<?php echo e(asset('plant/js/core/layout.js')); ?>?v=20261020a"></script>
		<?php echo $__env->yieldPushContent('scripts'); ?>

		<!-- 页面加载后：如果有登录 token，自动从后端同步用户数据 -->
		<script>
		(function(){
			function trySyncAfterLogin(){
				if (!window.Volta) return;
				var tk = localStorage.getItem('volta.token');
				if (!tk) return;
				if (Volta.Cart && typeof Volta.Cart.syncFromApi === 'function') {
					Volta.Cart.syncFromApi().catch(function(){});
				}
				// 其他用户数据（me/favorites/addresses/orders）也静默同步
				if (Volta.API && Volta.API.Member) {
					['me','favoriteIds','addresses','orders'].forEach(function(m){
						if (typeof Volta.API.Member[m] === 'function') {
							Volta.API.Member[m]().catch(function(){});
						}
					});
				}
			}
			document.addEventListener('volta:data-ready', trySyncAfterLogin, { once: true });
			document.addEventListener('DOMContentLoaded', function(){ setTimeout(trySyncAfterLogin, 600); });
		})();
		</script>

		</body>
</html>
<?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/plant/layoutplant.blade.php ENDPATH**/ ?>