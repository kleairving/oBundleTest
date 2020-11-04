import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    onReady() {

        let categoryItems = {
            'lineItems':[]
        }
        $('li.product').each(function(index, product){
            let productId = $('.quickview', this).attr('data-product-id')
            categoryItems.lineItems.push({'quantity': 1, 'productId': productId})
        })

        $('[data-button-type="add-cart"]').on('click', (e) => {
            $(e.currentTarget).next().attr({
                role: 'status',
                'aria-live': 'polite',
            });
        });

        compareProducts(this.context.urls);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => {
            $('span.reset-message').attr({
                role: 'status',
                'aria-live': 'polite',
            });
        });

        const removeAllBtn = $('.bulk-cart .remove-all-button');
        const addAllBtn = $('.bulk-cart .add-all-button');
        let currentCart;

        function getCart(url) {
            return fetch(url, {
                method: "GET",
                credentials: "same-origin"
            })
            .then(response => response.json());
        };
        function createNewCart(url, cartItems){
            return fetch(url, {
                method: "POST",
                credentials: "same-origin",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(cartItems),
            })
            .then(response => response.json());
        }
        function addCartItem(url, cartId, cartItems){
            return fetch(url + cartId + '/items', {
                method: "POST",
                credentials: "same-origin",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(cartItems),
            })
            .then(response => response.json());
        }
        function deleteCart(url, cartId){
            let deleteUrl = url + cartId
            var settings = {
                "async": true,
                "crossDomain": true,
                "url": deleteUrl,
                "method": "DELETE",
                "headers": {}
            }

            $.ajax(settings).done(function (response) {
                currentCart = ''
                removeAllBtn.html('Items Removed from Cart!')
                setTimeout(function(){
                    removeAllBtn.css('display','none')
                }, 3000)
            });
        }

        getCart('/api/storefront/carts?include=lineItems.digitalItems.options,lineItems.physicalItems.options')
        .then(data => {
            if(data.length > 0){
                currentCart = data[0]
                removeAllBtn.css('display', 'inline-block')
            } else {
                currentCart = ""
                removeAllBtn.css('display', 'none')
            }
        })
        .catch(error => console.error(error));

        function makeCart(){
            addAllBtn.html('Adding items...')
            createNewCart('/api/storefront/carts', categoryItems)
            .then(data => {
                currentCart = data
                removeAllBtn.css('display','inline-block')
                addAllBtn.html('Items Added to Cart!')
                setTimeout(function(){
                    addAllBtn.html('Add All to Cart')
                }, 3000)
            })
            .catch(error => console.error(error));
        }
        function updateCart(){
            addAllBtn.html('Adding items...')
            addCartItem('/api/storefront/carts/', currentCart.id, categoryItems)
            .then(data => {
                currentCart = data
                addAllBtn.html('Items Added to Cart!')
                setTimeout(function(){
                    addAllBtn.html('Add All to Cart')
                }, 3000)
            })
            .catch(error => console.error(error));
        }
        function clearCart(){
            removeAllBtn.html('Clearing Cart...')
            deleteCart('/api/storefront/carts/', currentCart.id)
        }

        addAllBtn.click(function(){
            if(currentCart){
                updateCart()
            } else {
                makeCart()
            }
        });
        removeAllBtn.click(clearCart);
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
