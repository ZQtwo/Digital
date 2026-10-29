<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
		<meta name="theme-color" content="#08090C">
		<title>VOLTA 控制台</title>
		<!-- 样式：令牌 → 基线 → 骨架 → 公共组件 → 后台 -->
		<link href="/admin/images/volta_logo.png?v=20261020" rel="icon">
		<link href="/admin/images/volta_logo.png?v=20261020" rel="shortcut icon">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/tokens.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/base.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/layout.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/components.css')); ?>">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/admin.css')); ?>?v=20261020a">
		<link rel="stylesheet" href="<?php echo e(asset('admin/css/pages.css')); ?>">
	</head>
	<body>
		<div class="admin-shell atmosphere">

			<!-- ========== 侧边栏 ========== -->
			<aside class="admin-side" data-mount="admin-sidebar">
				<div class="admin-brand">
					<span class="admin-brand__mark" aria-hidden="true">
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M13 4 L6 13.5 H11 L10 20 L18 10.5 H12.5 Z" />
						</svg>
					</span>
					<span class="admin-brand__text">
						<span class="admin-brand__title">VOLTA 控制台</span>
						<span class="admin-brand__sub">Inventory</span>
					</span>
				</div>

				<nav class="admin-nav" aria-label="后台导航">
					<!-- 主面板 -->
					<a href="<?php echo e(url('/shuma/admin/index')); ?>" class="admin-nav__item <?php echo e(request()->is('shuma/admin','shuma/admin/index') ? 'is-active' : ''); ?>" aria-current="page">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
						</svg>
						<span>主面板</span>
						<span class="admin-nav__badge" data-bind="sidebar.alertCount"></span>
					</a>

					<!-- 基础中心 -->
					<div class="admin-nav__group <?php echo e(request()->is('shuma/admin/categories','shuma/admin/members','shuma/admin/admins','shuma/admin/banners') ? 'is-open' : ''); ?>">
						<button type="button" class="admin-nav__head" data-action="toggle-group">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M12 3 2 8l10 5 10-5-10-5ZM2 8v8l10 5 10-5V8M12 13v8" />
							</svg>
							<span>基础中心</span>
							<svg class="admin-nav__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none"
								stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
								aria-hidden="true">
								<path d="M6 9l6 6 6-6" />
							</svg>
						</button>
						<div class="admin-nav__sub-list">
							<a href="<?php echo e(url('/shuma/admin/categories')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/categories') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>分类管理</span></a>
							<a href="<?php echo e(url('/shuma/admin/members')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/members') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>用户管理</span></a>
							<a href="<?php echo e(url('/shuma/admin/admins')); ?>" class="admin-nav__sub" data-require-role="super"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>管理员账号</span></a>
							<a href="<?php echo e(url('/shuma/admin/banners')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/banners') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>广告位管理</span></a>
						</div>
					</div>

					<!-- 商品中心 -->
					<div class="admin-nav__group <?php echo e(request()->is('shuma/admin/products','shuma/admin/products/create','shuma/admin/inventory') ? 'is-open' : ''); ?>">
						<button type="button" class="admin-nav__head" data-action="toggle-group">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3ZM3 7.5 12 12l9-4.5M12 12v9" />
							</svg>
							<span>商品中心</span>
							<svg class="admin-nav__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none"
								stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
								aria-hidden="true">
								<path d="M6 9l6 6 6-6" />
							</svg>
						</button>
						<div class="admin-nav__sub-list">
							<a href="<?php echo e(url('/shuma/admin/products/create')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/products/create') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>商品发布</span></a>
							<a href="<?php echo e(url('/shuma/admin/products')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/products') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>商品管理</span></a>
							<a href="<?php echo e(url('/shuma/admin/inventory')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/inventory') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>库存管理</span></a>
						</div>
					</div>

					<!-- 订单中心 -->
					<div class="admin-nav__group <?php echo e(request()->is('shuma/admin/orders','shuma/admin/orders/stats','shuma/admin/returns') ? 'is-open' : ''); ?>">
						<button type="button" class="admin-nav__head" data-action="toggle-group">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<circle cx="9" cy="20" r="1.4" />
								<circle cx="18" cy="20" r="1.4" />
								<path d="M2.5 3.5h2.2l2.2 11.2h11.4l2.2-8.2H6" />
							</svg>
							<span>订单中心</span>
							<svg class="admin-nav__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none"
								stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
								aria-hidden="true">
								<path d="M6 9l6 6 6-6" />
							</svg>
						</button>
						<div class="admin-nav__sub-list">
							<a href="<?php echo e(url('/shuma/admin/orders')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/orders') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>订单管理</span></a>
							<a href="<?php echo e(url('/shuma/admin/orders/stats')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/orders/stats') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>订单统计</span></a>
							<a href="<?php echo e(url('/shuma/admin/returns')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/returns') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>退换货管理</span></a>
						</div>
					</div>

					<!-- 系统中心 -->
					<div class="admin-nav__group <?php echo e(request()->is('shuma/admin/profile','shuma/admin/settings') ? 'is-open' : ''); ?>">
						<button type="button" class="admin-nav__head" data-action="toggle-group">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<circle cx="12" cy="12" r="3" />
								<path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
							</svg>
							<span>系统中心</span>
							<svg class="admin-nav__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none"
								stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
								aria-hidden="true">
								<path d="M6 9l6 6 6-6" />
							</svg>
						</button>
						<div class="admin-nav__sub-list">
							<a href="<?php echo e(url('/shuma/admin/profile')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/profile') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>个人信息</span></a>
							<a href="<?php echo e(url('/shuma/admin/settings')); ?>" class="admin-nav__sub <?php echo e(request()->is('shuma/admin/settings') ? 'is-active' : ''); ?>"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>系统设置</span></a>
							<a href="#" class="admin-nav__sub" data-action="logout"><span class="admin-nav__sub-dot" aria-hidden="true"></span><span>退出系统</span></a>
						</div>
					</div>
				</nav>

				<div class="admin-side__foot">
					<button type="button" class="btn btn--ghost btn--sm btn--block" data-action="admin-logout">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M15 17l5-5-5-5M20 12H9M12 3H5v18h7" />
						</svg>
						退出登录
					</button>
				</div>
			</aside>

			<div class="admin-scrim" data-action="close-nav" hidden></div>

			<!-- ========== 后台主体 ========== -->
			<div class="admin-body">

				<!-- 顶栏 -->
				<header class="admin-top" data-mount="admin-topbar">
					<button type="button" class="admin-burger" aria-label="打开导航" data-action="open-nav">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
							<path d="M4 7h16M4 12h16M4 17h16" />
						</svg>
					</button>
					<a href="<?php echo e(url('/shuma/admin/index')); ?>" class="admin-top__brand mobile-only" aria-label="VOLTA 控制台首页">
						<span class="admin-top__brand-mark" aria-hidden="true">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M13 4 L6 13.5 H11 L10 20 L18 10.5 H12.5 Z" />
							</svg>
						</span>
						<span class="admin-top__brand-text">VOLTA</span>
					</a>
					<span class="admin-top__title">控制台</span>
					<span class="admin-top__spacer"></span>
					<div class="admin-top__actions">
						<span class="tag tag--danger" data-bind="topbar.alertTag" hidden></span>
						<button type="button" class="icon-btn" data-action="toggle-theme" aria-label="切换到日间模式">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
								<circle cx="12" cy="12" r="4" />
								<path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
							</svg>
						</button>
						<a href="<?php echo e(url('/shuma/admin/profile')); ?>" class="mono admin-top__user" data-bind="topbar.adminName">admin</a>
						<button type="button" class="btn btn--sm btn--ghost admin-top__logout" data-action="admin-logout">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M15 17l5-5-5-5M20 12H9M12 3H5v18h7" />
							</svg>
							<span class="desktop-only">退出登录</span>
						</button>
					</div>
				</header>

				<!-- 主内容 -->
				<main id="main" class="admin-main">
					<div id="page-root">
						<?php echo $__env->yieldContent('adminmain'); ?>
					</div>
				</main>

			</div>
		</div>

		<!-- Toast 容器 -->
		<div data-mount="toast-host">
			<div class="toast-host" role="status" aria-live="polite"></div>
		</div>

		<!-- jQuery 本地引入 -->
		<script src="<?php echo e(asset('admin/js/vendor/jquery.min.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/enter-nav.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/storage.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/format.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/data.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/store-ui.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/store-user.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/store-inventory.js')); ?>?v=20261020a"></script>
		<script src="<?php echo e(asset('admin/js/core/reveal.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/product-art.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/store-admins.js')); ?>?v=20261020a"></script>
		<script src="<?php echo e(asset('admin/js/core/store-admin.js')); ?>?v=20261021b"></script>
		<script src="<?php echo e(asset('admin/js/core/admin-auth.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/store-products.js')); ?>?v=20261020a"></script>
		<script src="<?php echo e(asset('admin/js/core/store-orders.js')); ?>?v=20261020a"></script>
		<script src="<?php echo e(asset('admin/js/core/store-members.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/components-admin.js')); ?>"></script>
		<script src="<?php echo e(asset('admin/js/core/admin-layout.js')); ?>"></script>
		<?php echo $__env->yieldPushContent('scripts'); ?>
	</body>
</html>
<?php /**PATH E:\Users\燁\Desktop\测试\api-server\resources\views/admin/layoutadmin.blade.php ENDPATH**/ ?>