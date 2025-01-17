// to be replaced by table2
import React, { useMemo } from 'react';
import BTable from 'react-bootstrap/Table';
import { Dropdown, Form, Row, Col, Button } from 'react-bootstrap';
import {
  useTable,
  useGlobalFilter,
  useFilters,
  useAsyncDebounce,
  useSortBy,
  usePagination,
} from 'react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSort,
  faSortUp,
  faSortDown,
} from '@fortawesome/free-solid-svg-icons';
import { useDispatch } from 'react-redux';
import { saveAs } from 'file-saver';
import { actions as modalActions } from '../../../services/store/modal';

function GlobalFilter({ globalFilter, setGlobalFilter, handleSearch, title }) {
  const [value, setValue] = React.useState(globalFilter);
  const onChange = useAsyncDebounce((value) => {
    setGlobalFilter(value || '');
    handleSearch(value || '');
  }, 200);

  return (
    <Form.Group className="m-0">
      <Form.Control
        type="text"
        size="sm"
        placeholder="Search"
        value={value || ''}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        aria-label={`${title.replace(/\s/g, '')}-search`}
      />
    </Form.Group>
  );
}

function DefaultColumnFilter({ column: { filterValue, setFilter, Header } }) {
  return (
    <Form.Group className="m-0">
      <Form.Control
        value={filterValue || ''}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          setFilter(e.target.value || undefined); // Set undefined to remove the filter entirely
        }}
        placeholder={Header}
        type="text"
        size="sm"
        aria-label={`${Header}-search`}
      />
    </Form.Group>
  );
}

function PaginationText({
  from,
  to,
  size,
  singular = 'entry',
  plural = 'entries',
}) {
  return size > 0 ? (
    <span className="react-bootstrap-table-pagination-total ml-2 small text-muted">
      Showing&nbsp;
      {1 + to - from < size && `${from} to ${to} of `}
      {size.toLocaleString()}
      {size === 1 ? ` ${singular}` : ` ${plural || singular + 's'}`}
    </span>
  ) : null;
}

export default function Table({
  title = '',
  customTitle = <Col></Col>,
  columns,
  data,
  hidden,
  globalFilter: globalSearch,
  pagination,
  mergeState,
  downloadName,
  downloadLink,
}) {
  const dispatch = useDispatch();
  const mergeError = (msg) =>
    dispatch(
      modalActions.mergeModal({ error: { visible: true, message: msg } })
    );

  const defaultColumn = useMemo(
    () => ({
      Filter: DefaultColumnFilter,
    }),
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    setHiddenColumns,
    setGlobalFilter,
    rows,
    page,
    canPreviousPage,
    canNextPage,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize, globalFilter, hiddenColumns },
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      initialState: {
        hiddenColumns: hidden,
        globalFilter: globalSearch,
        sortBy: [
          { id: 'Year', desc: true },
          { id: 'p.value', desc: false },
        ],
        ...pagination,
      },
    },
    useGlobalFilter,
    useFilters,
    useSortBy,
    usePagination
  );

  // download file from results directory
  async function download(path) {
    try {
      const filename = path.split('/')[path.split('/').length - 1];
      const file = await fetch(`web/data/${path}`);
      if (file.ok) {
        saveAs(await file.blob(), filename);
      } else {
        mergeError(`File is not available`);
      }
    } catch (err) {
      console.log(err);
      mergeError(`File is not available`);
    }
  }

  return (
    <div>
      <Row className="mb-2">
        {title ? (
          <Col md="auto">
            <strong>{title}</strong>
          </Col>
        ) : (
          customTitle
        )}
        <Col />
        {(globalSearch || globalSearch == '') && (
          <Col md="auto">
            <div style={{ width: '280px' }}>
              <GlobalFilter
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                handleSearch={(query) => mergeState({ globalFilter: query })}
                title={title}
              />
            </div>
          </Col>
        )}
        {downloadLink && (
          <Col md="auto">
            <Button
              className="p-0 ml-auto"
              variant="link"
              onClick={() => download(downloadLink)}
            >
              {downloadName}
            </Button>
          </Col>
        )}
        <Col md="auto">
          <Dropdown>
            <Dropdown.Toggle
              variant="secondary"
              size="sm"
              id={`${title.replace(/\s/g, '')}-columns`}
            >
              Columns
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Form>
                {columns
                  // ignore DOI and Github column
                  .filter(({ id }) => id != 'DOI' && id != 'Github')
                  .map(({ id, Header }) => {
                    return (
                      <Form.Group
                        key={`${title.replace(/\s/g, '')}-${id}`}
                        controlId={`${title.replace(
                          /\s/g,
                          ''
                        )}-${id}-visibility`}
                        className="my-1 px-2"
                      >
                        <Form.Check
                          type="checkbox"
                          label={Header}
                          checked={hiddenColumns.indexOf(id) == -1}
                          onChange={() =>
                            setHiddenColumns((hiddenColumns) => {
                              const index = hiddenColumns.indexOf(id);
                              const newHidden =
                                index > -1
                                  ? hiddenColumns.filter((c) => c != id)
                                  : [...hiddenColumns, id];
                              mergeState({ hidden: newHidden });
                              return newHidden;
                            })
                          }
                        />
                      </Form.Group>
                    );
                  })}
              </Form>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>

      <BTable
        responsive
        striped
        bordered
        hover
        size="sm"
        {...getTableProps()}
        className="mb-2"
      >
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th
                  id={(column.id + '-' + title).replace(/\s/g, '')}
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                >
                  <span title={column.tooltip}>{column.render('Header')}</span>
                  {column.canSort && (
                    <span>
                      {' '}
                      {column.isSorted ? (
                        column.isSortedDesc ? (
                          <FontAwesomeIcon
                            className="text-primary"
                            icon={faSortDown}
                          />
                        ) : (
                          <FontAwesomeIcon
                            className="text-primary"
                            icon={faSortUp}
                          />
                        )
                      ) : (
                        <FontAwesomeIcon className="text-muted" icon={faSort} />
                      )}
                    </span>
                  )}
                  <div>
                    {/* Use column search if global search isn't used */}
                    {globalSearch == undefined ? column.render('Filter') : null}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps}>
          {page.map((row, i) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </BTable>
      <Row className="pagination">
        <Col>
          <select
            className="form-control-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              mergeState({ pagination: { pageSize: Number(e.target.value) } });
            }}
            aria-label="Select a pagination size"
          >
            {[5, 10, 25, 50, 100].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <PaginationText
            from={pageIndex * pageSize + 1}
            to={pageIndex * pageSize + page.length}
            size={rows.length}
          />
        </Col>

        <Col className="d-flex">
          <div className="ml-auto">
            <Button
              disabled={!canPreviousPage}
              className={`p-2 ${!canPreviousPage ? 'text-muted' : ''}`}
              variant="link"
              onClick={() => {
                gotoPage(0);
                mergeState({ pagination: { pageIndex: 0 } });
              }}
            >
              {'<<'}
            </Button>
            <Button
              disabled={!canPreviousPage}
              className={`p-2 ${!canPreviousPage ? 'text-muted' : ''}`}
              variant="link"
              onClick={() => {
                previousPage();
                mergeState({ pagination: { pageIndex: pageIndex - 1 } });
              }}
            >
              {'<'}
            </Button>
            <Button
              disabled={!canNextPage}
              className={`p-2 ${!canNextPage ? 'text-muted' : ''}`}
              variant="link"
              onClick={() => {
                nextPage();
                mergeState({ pagination: { pageIndex: pageIndex + 1 } });
              }}
            >
              {'>'}
            </Button>
            <Button
              disabled={!canNextPage}
              className={`p-2 ${!canNextPage ? 'text-muted' : ''}`}
              variant="link"
              onClick={() => {
                gotoPage(pageCount - 1);
                mergeState({ pagination: { pageIndex: pageCount - 1 } });
              }}
            >
              {'>>'}
            </Button>{' '}
            <span className="text-muted small align-center">
              Page: {pageIndex + 1}
            </span>
          </div>
        </Col>
      </Row>
    </div>
  );
}
