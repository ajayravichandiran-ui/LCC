import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  LccService,
  LccTransferItem
} from '../../services/lcc.service';
import {
  DistributionService,
  DistributionRecord
} from '../../services/distribution.service';
import { ReportsService } from '../../services/reports.service';


// =====================================================
// Distribution Product
// =====================================================

interface DistributionProduct {
  id: number;
  productId: string;
  name: string;
  availableQty: number;
  location: string;
  date: string;
  switchedBy: string;
  createdAt: string;
}




@Component({
  selector: 'app-distribution',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './distribution.html',
  styleUrl: './distribution.css'
})
export class Distribution implements OnInit, OnDestroy {
  private subscription?: Subscription;


  // =====================================================
  // MODAL
  // =====================================================

  showModal = false;


  // =====================================================
  // SEARCH
  // =====================================================

  searchText = '';


  // =====================================================
  // FORM DATA
  // =====================================================

  selectedVolunteer = '';

  selectedProduct = '';

  receiverName = '';

  distributionQuantity: number | null = null;

  distributionDate = this.getToday();


  // =====================================================
  // PRODUCTS
  // Products come from LCC Service
  // =====================================================

  products: DistributionProduct[] = [];


  // =====================================================
  // LOADING / ERROR
  // =====================================================

  loadingProducts = false;

  productError = '';


  // =====================================================
  // DISTRIBUTION HISTORY
  // =====================================================

  distributions: DistributionRecord[] = [];


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private lccService: LccService,
    private distributionService: DistributionService,
    private reportsService: ReportsService
  ) {}


  // =====================================================
  // ON INIT
  // =====================================================

  ngOnInit(): void {

    this.loadLccProducts();

    this.subscription = this.distributionService.records$.subscribe(records => {
      this.distributions = records;
    });

  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }


  // =====================================================
  // LOAD PRODUCTS FROM LCC
  // =====================================================

  loadLccProducts(): void {

    this.loadingProducts = true;

    this.productError = '';


    try {

      /*
       * Your LccService is using localStorage.
       *
       * getItems() directly returns:
       *
       * LccTransferItem[]
       */

      const lccItems =
        this.lccService.getItems();


      /*
       * Only products with quantity > 0
       * will be shown in Distribution.
       */

      this.products = lccItems

        .filter(
          item =>
            Number(item.quantity) > 0
        )

        .map(
          item => ({

            id: item.id,

            productId:
              item.productId,

            name:
              item.name,

            availableQty:
              Number(item.quantity) || 0,

            location:
              item.location ||
              'LCC Building',

            date:
              item.date || '',

            switchedBy:
              item.switchedBy || '',

            createdAt:
              item.createdAt || ''

          })
        );


      this.loadingProducts = false;

    }
    catch (error) {

      console.error(
        'Failed to load LCC products:',
        error
      );


      this.products = [];


      this.productError =
        'Unable to load products from LCC.';


      this.loadingProducts = false;

    }

  }


  // =====================================================
  // OPEN DISTRIBUTION MODAL
  // =====================================================

  openDistributionModal(): void {
    this.loadLccProducts();
    this.resetForm();
    this.showModal = true;
  }


  // =====================================================
  // CLOSE MODAL
  // =====================================================

  closeModal(): void {

    this.showModal = false;

  }


  // =====================================================
  // RESET FORM
  // =====================================================

  resetForm(): void {
    this.selectedVolunteer = '';
    this.selectedProduct = this.products.length > 0 ? String(this.products[0].id) : '';
    this.receiverName = '';
    this.distributionQuantity = null;
    this.distributionDate = this.getToday();
  }


  // =====================================================
  // GET SELECTED PRODUCT
  // =====================================================

  get selectedProductDetails():
    DistributionProduct | undefined {

    return this.products.find(
      product =>
        String(product.id) ===
        String(this.selectedProduct)
    );

  }


  // =====================================================
  // GET AVAILABLE QUANTITY
  // =====================================================

  get availableQuantity(): number {

    return (
      this.selectedProductDetails
        ?.availableQty ?? 0
    );

  }


  // =====================================================
  // GET NEW BALANCE
  // =====================================================

  get newBalance(): number {

    const product =
      this.selectedProductDetails;


    if (!product) {

      return 0;

    }


    const quantity =
      Number(
        this.distributionQuantity
      ) || 0;


    return Math.max(
      0,
      product.availableQty - quantity
    );

  }


  // =====================================================
  // STOCK PERCENTAGE
  // =====================================================

  get stockPercentage(): number {

    const product =
      this.selectedProductDetails;


    if (!product) {

      return 0;

    }


    /*
     * Your current LccTransferItem does not
     * contain totalQty.
     *
     * Therefore we simply show 100%
     * for currently available stock.
     */

    return product.availableQty > 0
      ? 100
      : 0;

  }


  // =====================================================
  // TOTAL DISTRIBUTIONS
  // =====================================================

  get totalDistributions(): number {

    return this.distributions.length;

  }


  // =====================================================
  // TOTAL UNITS DISTRIBUTED
  // =====================================================

  get lccToDistribution(): number {

    return this.distributions.reduce(
      (
        total,
        distribution
      ) => {

        return (
          total +
          Number(
            distribution.quantity
          )
        );

      },
      0
    );

  }


  // =====================================================
  // TODAY DISTRIBUTION
  // =====================================================

  get todayDistribution(): number {

    const today =
      this.getToday();


    return this.distributions

      .filter(
        distribution =>
          distribution.date === today
      )

      .reduce(
        (
          total,
          distribution
        ) => {

          return (
            total +
            Number(
              distribution.quantity
            )
          );

        },
        0
      );

  }


  // =====================================================
  // FILTER DISTRIBUTION HISTORY
  // =====================================================

  get filteredDistributions():
    DistributionRecord[] {

    const search =
      this.searchText
        .toLowerCase()
        .trim();


    if (!search) {

      return this.distributions;

    }


    return this.distributions.filter(
      distribution =>

        distribution.id
          .toLowerCase()
          .includes(search)

        ||

        distribution.product
          .toLowerCase()
          .includes(search)

        ||

        distribution.volunteer
          .toLowerCase()
          .includes(search)

        ||

        distribution.receiver
          .toLowerCase()
          .includes(search)

        ||

        distribution.date
          .toLowerCase()
          .includes(search)

        ||

        distribution.status
          .toLowerCase()
          .includes(search)

        ||

        distribution.location
          .toLowerCase()
          .includes(search)

    );

  }


  // =====================================================
  // CREATE DISTRIBUTION
  // =====================================================

  createDistribution(): void {


    // ---------------------------------------------------
    // Validate Volunteer
    // ---------------------------------------------------

    if (
      !this.selectedVolunteer.trim()
    ) {

      alert(
        'Please enter volunteer name.'
      );

      return;

    }


    // ---------------------------------------------------
    // Validate Product
    // ---------------------------------------------------

    if (!this.selectedProduct) {

      alert(
        'Please select a product from LCC.'
      );

      return;

    }


    // ---------------------------------------------------
    // Validate Quantity
    // ---------------------------------------------------

    if (
      this.distributionQuantity === null
      ||
      Number(
        this.distributionQuantity
      ) <= 0
    ) {

      alert(
        'Please enter a valid quantity.'
      );

      return;

    }


    const quantity =
      Number(
        this.distributionQuantity
      );


    // ---------------------------------------------------
    // Check Available Quantity
    // ---------------------------------------------------

    if (
      quantity >
      this.availableQuantity
    ) {

      alert(
        `Only ${this.availableQuantity} units are available in LCC.`
      );

      return;

    }


    // ---------------------------------------------------
    // Validate Receiver
    // ---------------------------------------------------

    if (
      !this.receiverName.trim()
    ) {

      alert(
        'Please enter receiver name.'
      );

      return;

    }


    // ---------------------------------------------------
    // Validate Date
    // ---------------------------------------------------

    if (!this.distributionDate) {

      alert(
        'Please select distribution date.'
      );

      return;

    }


    // ---------------------------------------------------
    // Get Selected Product
    // ---------------------------------------------------

    const product =
      this.selectedProductDetails;


    if (!product) {

      alert(
        'Selected product was not found.'
      );

      return;

    }


    // ---------------------------------------------------
    // Calculate New LCC Balance
    // ---------------------------------------------------

    const newBalance =
      product.availableQty -
      quantity;


    // ---------------------------------------------------
    // Create Updated LCC Item
    // ---------------------------------------------------

    const updatedLccItem:
      LccTransferItem = {

      id:
        product.id,

      productId:
        product.productId,

      name:
        product.name,

      quantity:
        newBalance,

      date:
        product.date,

      switchedBy:
        product.switchedBy,

      location:
        product.location,

      createdAt:
        product.createdAt

    };


    // ---------------------------------------------------
    // Update LCC Stock
    // ---------------------------------------------------

    try {
      if (newBalance <= 0) {
        this.lccService.deleteTransfer(product.id);
      } else {
        this.lccService.updateItem(updatedLccItem);
      }


      // -------------------------------------------------
      // Create Distribution ID
      // -------------------------------------------------

      const newId =
        `DIST-${String(
          this.distributions.length + 1
        ).padStart(
          4,
          '0'
        )}`;


      // -------------------------------------------------
      // Create Distribution Record
      // -------------------------------------------------

      const newDistribution:
        DistributionRecord = {

        id:
          newId,

        product:
          product.name,

        quantity:
          quantity,

        volunteer:
          this.selectedVolunteer.trim(),

        receiver:
          this.receiverName.trim(),

        date:
          this.distributionDate,

        status:
          'Assigned',

        location:
          product.location

      };


      // -------------------------------------------------
      // Add Distribution History
      // -------------------------------------------------

      this.distributionService.addDistribution(
        newDistribution
      );


      this.reportsService.recordEntry({
        productId: product.productId || '',
        productName: product.name,
        eventType: 'STOCK_TRANSFERRED',
        eventTitle: 'Transferred to Distribution',
        quantityChange: -quantity,
        previousStock: product.availableQty,
        newStock: Math.max(0, newBalance),
        location: product.location || 'LCC',
        updatedBy: this.selectedVolunteer.trim(),
        remarks: `Assigned to ${this.receiverName.trim()}`,
        date: this.distributionDate
      });

      // Reload Products
      this.loadLccProducts();

      // Close Modal
      this.closeModal();

      // Reset Form
      this.resetForm();
      // -------------------------------------------------

      this.closeModal();


      // -------------------------------------------------
      // Reset Form
      // -------------------------------------------------

      this.resetForm();

    }
    catch (error) {

      console.error(
        'Failed to update LCC stock:',
        error
      );


      alert(
        'Failed to update LCC stock. Distribution was not created.'
      );

    }

  }


  // =====================================================
  // GET TODAY
  // =====================================================

  getToday(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${year}-${month}-${day}`;
  }
}