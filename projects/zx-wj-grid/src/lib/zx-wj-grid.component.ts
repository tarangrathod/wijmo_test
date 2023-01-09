import {
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
  OnChanges,
} from '@angular/core';
import * as wjcCore from '@grapecity/wijmo';
import * as wjcGrid from '@grapecity/wijmo.grid';
import * as wjcGridFilter from '@grapecity/wijmo.grid.filter';
import * as wjcGridSearch from '@grapecity/wijmo.grid.search';
import * as wjGridSelector from '@grapecity/wijmo.grid.selector';
import { IExcelExportContext, ExportService } from './app.export';
import { IValidator } from './app.validation';
import { Globalize } from '@grapecity/wijmo';
import { __importDefault } from 'tslib';
import { chunk, cloneDeep } from 'lodash';
// import * as turbojs from 'turbojs';
export class KeyValue {
  key!: number;
  value!: string;

  static NotFound: KeyValue = { key: -1, value: '' };
}
@Component({
  selector: 'zx-wj-grid',
  templateUrl: './zx-wj-grid.component.html',
  styleUrls: ['./zx-wj-grid.component.scss'],
})
export class ZxWjGridComponent implements AfterViewInit, OnChanges {
  _itemsSource!: wjcCore.CollectionView;
  _dayMap: wjcGrid.DataMap<number, KeyValue>;
  _theGrid: any;
  @Input() gridId: any = '';
  @Input() gridOptions: any;
  @Input() gridData: any = [];
  @Input() selectedData: any = [];
  @Input() filterColumns: any = [];
  @Input() searchIdInput: any = undefined;
  @Input() filterOnMapIdInput: any = undefined;
  @Input() validationConfigInput: any = undefined;
  @Input() gridBtnList: any = [];
  @Input() defaultValues: any = undefined;
  @Input() columnGroupsStatus: any = undefined;
  @Input() exportValues: boolean = false; //  (send random value)
  @Input() addNew: any = ''; //  (send random value)
  @Input() newRowsAsArray: any = []; // Takes an array as an input to add all the new rows
  @Input() getItemsSource: any = 0; // This input is used to fetch the latest itemsource from the grid (send random value)
  @Input() exportFileName: string = 'export.xlsx';  // This is the default export file name that you want to give while exporting the data
  @Input() componentHeight: any = undefined; // This input takes the value of the default Height of the Component
  @Input() componentMaxHeight: any = undefined; // This input takes the value of Max possible Height of the Component
  @Input() enableCheckbox: boolean = false; // This input is used to enable row-wise checkbox-based selection
  @Input() selectAllRows: boolean = false; // This input must be triggered when you want all the data in the Grid to be selected automatically  (send random value)
  @Input() deleteCheckedRows: any = undefined; // This input must be triggered when you want to delete the checked rows from the Grid (send random value)
  @Input() refreshGridConfig: any = false; // This inout must be triggered when you want to update the current Grid's configuration, which may include column definitions etc.
  @Input() showNoDataAvailable: any = false; // This property must be set True If you want to show "No Data Available" message in each column
  @Input() headerSize: any = ''; // This value must be set If you want to give a custom height to the header row in the Grid
  @Input() getErrorFunction: ((args: any, prop: any, grid: any) => void) | undefined; // This input takes a complete Function which can be used to provide custom validations. Note: This function will override the default validations
  @Input() resetItemCount: any = false;
  @Input() selectFewRows: any = {};
  @Input() createChkBx: any = [];
  @Input() gridColTooltip: any = []; // this take col of array for showing tooltip
  @Output() datasrc: EventEmitter<wjcCore.CollectionView> = new EventEmitter(); // This will emit the grid data
  @Output() itemCountUpdated: EventEmitter<wjcCore.CollectionView> = new EventEmitter();
  @Output() btnClickEvent = new EventEmitter<any>();
  @Output() gridInstance = new EventEmitter<any>();
  @Output() rowAdded = new EventEmitter<boolean>();
  @Output() checkedItems = new EventEmitter<boolean>();
  @Output() deletedRows = new EventEmitter<any>();
  @Output() filterOnMapChecked = new EventEmitter<any>();
  @Output() isFilterApplied = new EventEmitter<any>();
  @Output() errorStatus = new EventEmitter<any>();
  @ViewChild('recordCount') recordCountId!: ElementRef;
  @ViewChild('dataTable') dataTableId!: ElementRef;
  @ViewChild('searchBar') searchBarId!: ElementRef;
  @ViewChild('optionsPanel') optionsPanelId!: ElementRef;
  gridIdChanged = false;
  gridIdVar: any = '';
  searchIdVar: any = '';
  recordCountIdVar = '';
  filterOnMapEnabled = false;
  changesVar: SimpleChanges | undefined;
  componentInitialized = false;
  showGrid1Buttons = false;
  gridBtnListVar = [];
  _selectedRow: any;
  _selectedCol: any;
  defaultValuesVar = {};
  copy = [];
  checkedRows: any = [];
  checkedRowsData: any = [];
  newRowsAsArrayVar: any = [];
  addNewRowsRunning = 0;
  gridFilter: any;
  // private _countryMap: wjcGrid.DataMap<number, Country>;
  private _excelExportContext: IExcelExportContext;
  loadedData = [];
  private _days: string[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  private _validationConfig: { [prop: string]: IValidator[] } | any = {};
  finalData: any;

  get excelExportContext(): IExcelExportContext {
    return this._excelExportContext;
  }

  constructor(private _exportSvc: ExportService) {
    // initializes data maps
    this._dayMap = this._buildDataMap(this._days);
    // initializes export
    this._excelExportContext = {
      exporting: false,
      progress: 0,
      preparing: false,
    };
  }
  ngOnChanges(changes: SimpleChanges) {

    this.changesVar = changes;
    if (changes.gridData) {
      if (this.componentInitialized == true && changes.gridData.currentValue) {
        this._initializeGrid(changes);
        this.changesFunc(changes);
      } else if (this.componentInitialized == true) {
        this._initializeGrid(changes);
        this.changesFunc(changes);
      }
    } else {
      this.changesFunc(changes);
    }
  }

  changesFunc(changes: SimpleChanges) {
    if (changes.exportValues) {
      if (changes.exportValues.currentValue) {
        this.exportToExcel();
      }
    }
    if (this.componentInitialized == true) {
      if (changes.selectedData || changes.gridData) {
        if (changes.selectedData) {
          if (changes.selectedData.currentValue.length == 0) return false;
          let RRDATA = chunk(changes.selectedData.currentValue, 20000);
          let index = 0;
          RRDATA.map((e: any) => {
            this._theGrid.rows.splice(index, e.length, ...e);
            index += e.length;
          });
          // this._theGrid.collectionView.refresh();
        }
      }
    }
    if (changes.addNew) {
      if (changes.addNew.currentValue) {
        this.AddNewRow();
      }
    }
    if (changes.newRowsAsArray) {
      if (changes.newRowsAsArray.currentValue) {
        this.newRowsAsArrayVar = this.newRowsAsArrayVar.concat(this.newRowsAsArray);
        if (this.addNewRowsRunning == 0) {
          this.addNewRowsRunning = 1;
          this.AddNewRowAsArray();
        }
      }
    }
    if (changes.getItemsSource) {
      if (changes.getItemsSource.currentValue) {
        this.getItemSourceData();
      }
    }
    if (changes.componentHeight) {
      if (this.optionsPanelId) {
        this.dataTableId.nativeElement.style.height = (Number(this.componentHeight) - this.optionsPanelId.nativeElement.offsetHeight) + 'px';
      }
    }
    if (changes.componentMaxHeight) {
      if (this.optionsPanelId) {
        this.dataTableId.nativeElement.style.maxHeight = (Number(this.componentMaxHeight) - this.optionsPanelId.nativeElement.offsetHeight) + 'px';
      }
    }
    if (this._theGrid) {
      if (changes.deleteCheckedRows) {
        if (changes.deleteCheckedRows.currentValue) {
          this.deleteCheckedRowsFunc();
        }
      }
    }
    if (this._theGrid) {
      if (changes.refreshGridConfig) {
        if (this.gridOptions) {
          while (this._theGrid.columns.length) {
            this._theGrid.columns.removeAt(0);
          }
          if (this.columnGroupsStatus == undefined) {
            for (let i in this.gridOptions.columns) {
              let c: any = new wjcGrid.Column();
              for (let j in this.gridOptions.columns[i]) {
                c[j] = this.gridOptions.columns[i][j];
              }
              this._theGrid.columns.push(c);
            }
          } else {
            for (let i in this.gridOptions.columns) {
              if (!this.gridOptions.columns[i].hasOwnProperty('columns')) {
                let c: any = new wjcGrid.Column();
                for (let j in this.gridOptions.columns[i]) {
                  c[j] = this.gridOptions.columns[i][j];
                }
                this._theGrid.columns.push(c);
              } else {
                let colGrp: any = new wjcGrid.Column();
                for (let l in this.gridOptions.columns[i]) {
                  if (l != 'columns') {
                    colGrp[l] = this.gridOptions.columns[i][l]
                  }
                }
                if (this.gridOptions.columns[i].hasOwnProperty('columns')) {
                  this.gridOptions.columns[i].columns.map((info, index) => {
                    if (info.hasOwnProperty('columns')) {
                      let colGrp2: any = new wjcGrid.Column();
                      for (let l in this.gridOptions.columns[i].columns[index]) {
                        if (l != 'columns') {
                          colGrp2[l] = this.gridOptions.columns[i].columns[index][l]
                        }
                      }
                      colGrp2.parentGroup = colGrp
                      info.columns.map(e => {
                        let c1: any = new wjcGrid.Column(e)
                        c1.parentGroup = colGrp2
                        this._theGrid.columns.push(c1)
                      })
                    } else {
                      let c1: any = new wjcGrid.Column(info)
                      c1.parentGroup = colGrp
                      this._theGrid.columns.push(c1)
                    }
                  })
                }
              }
            }
          }
        }
      }
    }
    if (this._theGrid) {
      if (changes.headerSize) {
        this._theGrid.columnHeaders.rows.defaultSize = changes.headerSize.currentValue;
      }
    }

    if (changes.defaultValues) {
      if (changes.defaultValues.currentValue)
        this.defaultValuesVar = Object.assign({}, this.defaultValues);
    }

    if (this._theGrid) {
      if (this.selectAllRows) {
        for (var i = 0; i < this._theGrid.rows.length; i++) {
          this._theGrid.rows[i].isSelected = true;
        }
        this.checkedItems.emit(this._theGrid.rows);
      }
      if (this.searchIdInput) {
        this.getCount();
      }
    }
    if (changes.resetItemCount) {
      if (changes.resetItemCount.currentValue) {
        this.gridFilter.clear()
        this._theGrid.collectionView.refresh();
        this.isFilterApplied.emit(false);
      }
    }

    /**
    * Adding new row when data is not available.
    */
    if (this._theGrid && this._theGrid.collectionView && this._theGrid.collectionView.sourceCollection.length == 0) {
      // if (changes.showNoDataAvailable) {
      //   if (changes.showNoDataAvailable.currentValue) {
      this.addMessageRow(this._theGrid);
      //   }
      // }
    }

    /**
     * clear all filter
     */
    if (changes.clearFilter) {
      if (changes.clearFilter.currentValue) {
        this.clearAllFilter();
      }
    }
  }

  deleteCheckedRowsFunc() {
    let tempGridData = Object.assign([], this.gridData);
    if (this.checkedRows.length) {
      for (var i in this.checkedRows) {
        for (var j in tempGridData) {
          let equals = false;
          for (var k in tempGridData[j]) {
            if (this.checkedRows[i].dataItem[k] == tempGridData[j][k]) {
              equals = true;
            } else {
              equals = false;
              break;
            }
          }
          if (equals) {
            tempGridData.splice(j, 1);
          }
        }
      }
    }
    this.gridData = tempGridData;
    this._itemsSource = this._createItemsSource();
    this._theGrid.itemsSource = this._itemsSource;
    this.deletedRows.emit(this.checkedRowsData);
    this.datasrc.emit(this._theGrid)
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.componentInitialized = true;
      if (this.changesVar) {
        this._initializeGrid(this.changesVar);
        this.changesFunc(this.changesVar);
        if (this.searchIdInput) {
          this.getCount();
        }
      }
    }, 0)
  }
  ngOnDestroy() {
    const ctx = this._excelExportContext;
    this._exportSvc.cancelExcelExport(ctx);
  }
  _initializeGrid(changes: SimpleChanges) {
    // creates the grid
    if (this.gridIdChanged == false) {
      if (changes.gridId) {
        if (changes.gridId.firstChange && this.dataTableId) {
          this.gridIdVar = this.gridId;

          /*
          * The below few lines are used to check If Buttons need to be displayed above the table
          */
          if (this.gridBtnList && (this.gridBtnListVar.length > 0 || this.gridBtnList.length > 0)) {
            this.showGrid1Buttons = true;
          }


          this.defaultValuesVar = Object.assign({}, this.defaultValues);
          this.gridIdVar = this.gridId;

          this.gridBtnListVar = this.gridBtnList;

          this.dataTableId.nativeElement.id = this.gridIdVar;
          this.gridIdChanged = true;
          this.gridOptions.deferResizing = true
          // this.gridOptions.autoRowHeights = true
          this._theGrid = new wjcGrid.FlexGrid(
            '#' + this.gridIdVar,
            this.gridOptions
          );
          if (changes.enableCheckbox) {
            if (changes.enableCheckbox.currentValue) {
              let selector = new wjGridSelector.Selector(this._theGrid, {
                itemChecked: () => {
                  this.checkedRows = this._theGrid.rows.filter((r: any) => r.isSelected);
                  this.checkedRowsData = [];
                  for (let i = 0; i < this._theGrid.rows.length; i++) {
                    if (this._theGrid.rows[i].isSelected)
                      this.checkedRowsData.push(this._theGrid.rows[i].dataItem);
                  }
                  // if (this.checkedRows.length) {
                  // var toBeEmitted = { gridId: this.checkedRows[0].grid._e.id, data: this._theGrid.rows.filter((r: any) => r.isSelected) };
                  this.checkedItems.emit(this.checkedRows);
                  // }
                }
              });
            }
          }
          this.initializeToolTip();

          // adds Excel-like filter
          if (this.filterColumns) {
            if (this.filterColumns.length != 0) {
              this.gridFilter = new wjcGridFilter.FlexGridFilter(this._theGrid, {
                filterColumns: this.filterColumns,
              });
              this.gridFilter.defaultFilterType = wjcGridFilter.FilterType.Condition;
              // try {
              this.gridFilter.filterChanging.addHandler((s, e) => {
                if (this._theGrid.columns[e.col].dataType === wjcCore.DataType.String) {
                  var colFilter = this.gridFilter.getColumnFilter(e.col);
                  if (!colFilter.conditionFilter.isActive) {
                    colFilter.conditionFilter.condition1.operator = wjcGridFilter.Operator.CT; // Contains operator for String columns
                  }
                } else if (this._theGrid.columns[e.col].dataType === wjcCore.DataType.Number) {
                  var colFilter = this.gridFilter.getColumnFilter(e.col);
                  if (!colFilter.conditionFilter.isActive) {
                    colFilter.conditionFilter.condition1.operator = wjcGridFilter.Operator.EQ; // Equals operator for number columns
                  }
                }
                else if (this._theGrid.columns[e.col].dataType === wjcCore.DataType.Date) {
                  var colFilter = this.gridFilter.getColumnFilter(e.col);
                  if (!colFilter.conditionFilter.isActive) {
                    colFilter.conditionFilter.condition1.operator = wjcGridFilter.Operator.EQ; // Equals operator for Date columns
                  }
                }
                else if (this._theGrid.columns[e.col].dataType === wjcCore.DataType.Boolean) {
                  var colFilter = this.gridFilter.getColumnFilter(e.col);
                  if (!colFilter.conditionFilter.isActive) {
                    colFilter.conditionFilter.condition1.operator = wjcGridFilter.Operator.EQ; // Equals operator for Boolean columns
                  }
                }
                var editor = s.activeEditor;
                var clear = editor.hostElement.querySelector('[wj-part="btn-clear"]');
                clear.addEventListener('click', (e: any) => {
                  setTimeout(() => {
                    this.gridFilter.clear();
                    this.isFilterApplied.emit(false);
                    this._theGrid.collectionView.refresh();
                    if (this.filterOnMapEnabled)
                      this.itemCountUpdated.emit(this._theGrid);
                  }, 500);
                }, true);
                var apply = editor.hostElement.querySelector('[wj-part="btn-apply"]');
                apply.addEventListener('click', (e: any) => {
                  setTimeout(() => {
                    this.isFilterApplied.emit(true);
                    this._theGrid.collectionView.refresh();
                    if (this.filterOnMapEnabled)
                      this.itemCountUpdated.emit(this._theGrid);
                  }, 500);
                }, true);

              });
            }
          }
          if (changes.searchIdInput) {
            if (changes.searchIdInput.firstChange && this.searchBarId) {
              // create the grid search box
              this.searchIdVar = this.searchIdInput;
              this.searchBarId.nativeElement.id = this.searchIdInput;
              let search = new wjcGridSearch.FlexGridSearch('#' + this.searchIdInput, {
                placeholder: 'Filter Data',
                grid: this._theGrid,
                cssMatch: 'flexgrid-matchedCss',
                delay: 2000
              });
              let input = search.hostElement.querySelector('[wj-part="input"]');
              input.addEventListener('keyup', (e: any) => {
                e.stopPropagation()
                if (e.keyCode === 13) {
                  setTimeout(() => {
                    this._theGrid.collectionView.refresh();
                    if (this.filterOnMapEnabled)
                      this.itemCountUpdated.emit(this._theGrid);
                  }, 1000);
                }
              }, true);

              let clear = search.hostElement.querySelector('[wj-part="btn"]');
              clear.addEventListener('click', (e: any) => {
                setTimeout(() => {
                  this._theGrid.collectionView.refresh();
                  if (this.filterOnMapEnabled)
                    this.itemCountUpdated.emit(this._theGrid);
                }, 1000);
              }, true);
              this.recordCountIdVar = Math.random()
                .toString(36)
                .replace(/[^a-z]+/g, '')
                .substr(0, 5);
              this.recordCountId.nativeElement.id = this.recordCountIdVar;
            }
          }

          if (this.validationConfigInput) {
            if (changes.validationConfigInput) {
              this._validationConfig = this.validationConfigInput;
              this._itemsSource = this._createItemsSource();
            }
          }
        }
      }
    }

    if (this.componentHeight) {
      this.dataTableId.nativeElement.style.maxHeight = (Number(this.componentHeight) - this.optionsPanelId.nativeElement.offsetHeight) + 'px';
    }
    if (this.componentMaxHeight) {
      this.dataTableId.nativeElement.style.maxHeight = (Number(this.componentMaxHeight) - this.optionsPanelId.nativeElement.offsetHeight) + 'px';
    }

    if (this._theGrid) {
      if (this.headerSize) {
        this._theGrid.columnHeaders.rows.defaultSize = this.headerSize;
      }
    }

    var filter = wjcCore.culture.FlexGridFilter,
      Operator = wjcGridFilter.Operator;
    filter.stringOperators = [
      { name: '(not set)', op: null },
      { name: 'Contains', op: Operator.CT },
      { name: 'Equals', op: Operator.EQ },
      { name: 'Does not equal', op: Operator.NE },
      // { name: 'Is bigger than', op: Operator.GT },
      // { name: 'Is smaller than', op: Operator.LT },
    ];
    filter.numberOperators = [
      { name: '(not set)', op: null },
      // { name: 'Contains', op: Operator.CT },
      { name: 'Equals', op: Operator.EQ },
      { name: 'Does not equal', op: Operator.NE },
      { name: 'Is bigger than', op: Operator.GT },
      { name: 'Is smaller than', op: Operator.LT },
      { name: 'Is Greater than or equal to', op: Operator.GE },
    ];
    filter.dateOperators = [
      { name: '(not set)', op: null },
      { name: 'Equals', op: Operator.EQ },
      { name: 'Is earlier than', op: Operator.LT },
      { name: 'Is later than', op: Operator.GT },
    ];
    filter.booleanOperators = [
      { name: '(not set)', op: null },
      { name: 'Is', op: Operator.EQ },
      { name: 'Is not', op: Operator.NE },
    ];

    this._itemsSource = this._createItemsSource();
    this._itemsSource.trackChanges = true;
    if (this._theGrid) {
      this._theGrid.itemsSource = this._itemsSource;
      if (this.selectAllRows) {
        for (var i = 0; i < this._theGrid.rows.length; i++) {
          this._theGrid.rows[i].isSelected = true;
        }
        this.checkedItems.emit(this._theGrid.rows);
      }
      if (this.selectFewRows.hasOwnProperty('name')) {
        let key = this.selectFewRows.name;
        let values = this.selectFewRows.values;
        for (var i = 0; i < this._theGrid.rows.length; i++) {
          if (values.includes(this._theGrid.rows[i].dataItem[key])) {
            this._theGrid.rows[i].isSelected = true;
          }
        }
        this.checkedRows = this._theGrid.rows.filter((r: any) => r.isSelected);
        this.checkedItems.emit(this.checkedRows);
      }
      if (this.searchIdInput) {
        this.getCount();
      }
    }
    this.gridInstance.emit(this._theGrid);
  }

  filterOnMapFun() {
    this.filterOnMapEnabled = !this.filterOnMapEnabled;
    this.filterOnMapChecked.emit({ checked: this.filterOnMapEnabled, grid: this._theGrid });
  }

  initializeToolTip() {
    if (this._theGrid) {
      let toolTip = new wjcCore.Tooltip();
      this._theGrid.hostElement.addEventListener(
        'mouseover',
        (e: MouseEvent) => {
          let ht = this._theGrid.hitTest(e),
            rng = null;
          if (!ht.range.equals(rng)) {
            // Checks to make sure that we're in the ColumnHeader row
            rng = ht.range;
            let col = this._theGrid.getColumn(rng.col)
            if (ht.cellType == 2) {
              let cellElement: any = document.elementFromPoint(e.clientX, e.clientY);
              let cellBounds = wjcCore.Rect.fromBoundingRect(
                cellElement.getBoundingClientRect()
              );
              let text = cellElement.innerHTML.split('</button>');
              if (text.length > 1) {
                text = text[text.length - 1]
              } else {
                text = text[0]
              }
              if (text.includes('&nbsp;')) {
                text = text.split('&nbsp;')[0]
              }
              let tipContent = `<span style="font-size: 12px; margin: 0px">${text}</span>`;
              if (cellElement.className.indexOf('wj-cell') > -1) {
                toolTip.show(this._theGrid.hostElement, tipContent, cellBounds);
              } else {
                toolTip.hide(); // cell must be behind scroll bar...
              }
            } else if (col && this.gridColTooltip.length && this.gridColTooltip.includes(col.binding)) {
              let data = this._theGrid.getCellData(rng.row, rng.col, true);
              if (data) {
                let cellElement: any = document.elementFromPoint(e.clientX, e.clientY);
                let cellBounds = wjcCore.Rect.fromBoundingRect(
                  cellElement.getBoundingClientRect()
                );
                let tipContent = `<span style="font-size: 12px; margin: 0px">${data}</span>`;
                if (cellElement.className.indexOf('wj-cell') > -1) {
                  toolTip.show(this._theGrid.hostElement, tipContent, cellBounds);
                } else {
                  toolTip.hide(); // cell must be behind scroll bar...
                }
              }
            }
          }
        }
      );
      this._theGrid.hostElement.addEventListener(
        'mouseout',
        (e: MouseEvent) => {
          toolTip.hide();
        }
      );
    }
  }

  clearAllFilter() {
    this.gridFilter.clear()
    this._theGrid.collectionView.sortDescriptions.clear()
    this._theGrid.collectionView.refresh();
    this.isFilterApplied.emit(false);

    /* If the above code does not work, then you can try the below commented code
    this._theGrid.collectionView.sortDescriptions.clear()
    */

    if (this.filterOnMapEnabled) {
      this._theGrid.collectionView.refresh();
      this.itemCountUpdated.emit(this._theGrid);
    }
  }

  selectRowsRequest(i: any, j: any) {
    const p1 = performance.now();
    this._theGrid.rows.slice(i, j).map((e: any) => {
      e.isSelected = true;
      return e;
    });
    const p2 = performance.now();
    return new Promise((resolve) => {
      resolve(1);
    });
  }

  unselectRowsRequest(i: any, j: any) {
    this._theGrid.rows.slice(i, j).map((e: any) => {
      e.isSelected = false;
      return e;
    });
    return new Promise((resolve) => {
      resolve(1);
    });
  }
  async process(arrayOfPromises: any) {
    let responses = await Promise.all(arrayOfPromises);
    return;
  }

  public get row(): any {
    return this.addNew;
  }

  AddNewRow() {
    // this.addNew.subscribe((val) => {
    // if (val) {
    this.defaultValuesVar = Object.assign({}, this.defaultValues);
    let itemToAdd = {};
    if (this.defaultValuesVar) {
      itemToAdd = Object.assign({}, this.defaultValuesVar);
    }
    this._itemsSource.sourceCollection.splice(0, 0, itemToAdd);
    this._itemsSource.refresh();
    this._theGrid.itemsSource.itemsAdded.push(itemToAdd);
    // }
    if (this.searchIdInput) {
      this.getCount();
    }
    this.rowAdded.emit(this._theGrid);
    this.datasrc.emit(this._theGrid)
    // });
  }

  AddNewRowAsArray() {
    let temp = this.newRowsAsArrayVar;
    while (temp.length != 0) {
      this._itemsSource.sourceCollection.splice(0, 0, temp[0]);
      this._itemsSource.refresh();
      this._theGrid.itemsSource.itemsAdded.push(temp[0]);
      temp.shift();
    }
    if (this.searchIdInput) {
      this.getCount();
    }
    this.rowAdded.emit(this._theGrid);
    this.addNewRowsRunning = 0;
  }

  getItemSourceData() {
    this.datasrc.emit(this._theGrid);
  }

  getCount() {
    if (this._theGrid && this.recordCountIdVar) {
      this.updateItemCount();
      this._theGrid.collectionView.collectionChanged.addHandler(() => {
        this.updateItemCount();
      });
    }
  }

  updateItemCount() {
    let cnt = this._theGrid.collectionView.items.length;
    let el: any = document.getElementById(this.recordCountIdVar);
    if (el)
      el.textContent = Globalize.format(cnt, 'n0');
  }

  exportToExcel() {
    this.exportValues = false;
    this._exportSvc.exportToCsv(cloneDeep(this._theGrid), this.exportFileName);
  }

  private _createItemsSource(): wjcCore.CollectionView {
    var data = this.gridData;
    var view = new wjcCore.CollectionView(data, {
      getError: (item: any, prop: any) => {
        if (this.getErrorFunction) {
          /*
          * item - this contains the complete row which is being editted's data
          * prop - this contains the current cell being editted's binding
          */
          let validationResult = this.getErrorFunction(item, prop, this._theGrid);
          this.errorStatus.emit(validationResult)
          if (validationResult != null) {
            return validationResult;
          }
        }
        else {
          if (this._theGrid.columns.getColumn(prop) != null || this._theGrid.columns.getColumn(prop) != undefined) {
            const displayName = this._theGrid.columns.getColumn(prop).header;
            return this.validate(item, prop, displayName);
          }
        }
      },
    });
    return view;
  }

  private _buildDataMap(items: string[]): wjcGrid.DataMap<number, KeyValue> {
    const map: KeyValue[] = [];
    for (let i = 0; i < items.length; i++) {
      map.push({ key: i, value: items[i] });
    }
    return new wjcGrid.DataMap<number, KeyValue>(map, 'key', 'value');
  }

  validate(item: any, prop: string, displayName: string): any {
    const validators: IValidator[] = this._validationConfig[prop];

    if (wjcCore.isUndefined(validators)) {
      return '';
    }
    const value = item[prop];
    for (let i = 0; i < validators.length; i++) {
      const validationError = validators[i].validate(displayName, value);
      if (!wjcCore.isNullOrWhiteSpace(validationError)) {
        return validationError;
      }
    }
  }
  eventClick(name: any) {
    if (name == 'filter-remove') {
      this.clearAllFilter()
    }
    else if (name == 'Enable filter on map' || name == 'Disable filter on map') {
      this.filterOnMapFun()
    } else {
      this.btnClickEvent.emit({ name, 'grid': this._theGrid });
    }
  }

  addMessageRow(grid: any) {
    let data: any = {};
    if (this.gridOptions.columnGroups) {
      this.gridOptions.columnGroups.forEach((e: any) => {
        if (!e.binding) {
          e.columns.forEach((element: any) => {
            data[element.binding] = 'No Data Available.'
          });
        } else {
          data[e.binding] = 'No Data Available.'
        }
      });
    } else {
      this.gridOptions.columns.forEach((e: any) => {
        data[e.binding] = 'No Data Available.'
      });
    }
    this._theGrid.rows.removeAt(0)
    let row = new wjcGrid.Row(data);
    row.allowMerging = true;
    this._theGrid.rows.push(row);
  }
  checkChangeEvent(event: any) {
    this.btnClickEvent.emit({ name: event.target.name, 'grid': this._theGrid, isChecked: event.target.checked });
  }
}
