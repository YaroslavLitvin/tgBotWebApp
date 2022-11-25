var currentPage = 1;
var pagesTotal = 2;

function setPage(pageNumber)
{
    if(pageNumber < 0)
    {
        console.error(`setPage. pageNumber < 0(${pageNumber})`);
        return;
    }

    if(pageNumber > pagesTotal)
    {
        console.error(`setPage. pageNumber > pagesTotal(${pageNumber})`);
        return;
    }

    var newPage = document.getElementById(`page${pageNumber}Container`);
    var currPage = document.getElementById(`page${currentPage}Container`);

    if(pageNumber > currentPage)
    {
        newPage.style.bottom = "0";
        newPage.style.top = "auto";

        currPage.style.bottom = "auto";
        currPage.style.top = "0";
    }
    else
    {
        newPage.style.bottom = "auto";
        newPage.style.top = "0";

        currPage.style.bottom = "0";
        currPage.style.top = "auto";
    }

    currPage.style.height = "0";
    newPage.style.height = "100%";

    currentPage = pageNumber;
}
